import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface CartRequest {
  action: "add" | "remove" | "get" | "clear" | "summarize";
  customer_phone: string;
  merchant_id: string;
  product_id?: string;
  quantity?: number;
}

interface CartItem {
  product_id: string;
  quantity: number;
}

async function addToCart(
  customer_phone: string,
  merchant_id: string,
  product_id: string,
  quantity: number
) {
  try {
    let { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone_number", customer_phone)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert([{ phone_number: customer_phone, name: "Guest", is_guest: true }])
        .select("id")
        .single();
      customer = newCustomer!;
    }

    let { data: cart } = await supabase
      .from("carts")
      .select("id, items")
      .eq("customer_id", customer.id)
      .eq("merchant_id", merchant_id)
      .maybeSingle();

    if (!cart) {
      const { data: newCart } = await supabase
        .from("carts")
        .insert([
          {
            customer_id: customer.id,
            merchant_id,
            items: [{ product_id, quantity }],
          },
        ])
        .select("id, items")
        .single();
      cart = newCart!;
    } else {
      const items: CartItem[] = cart.items || [];
      const existingItem = items.find((i) => i.product_id === product_id);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        items.push({ product_id, quantity });
      }

      const { data: updatedCart } = await supabase
        .from("carts")
        .update({ items })
        .eq("id", cart.id)
        .select("id, items")
        .single();
      cart = updatedCart!;
    }

    return {
      success: true,
      message: `Added ${quantity}x product to cart`,
      items_count: (cart.items as CartItem[]).reduce((sum, i) => sum + i.quantity, 0),
    };
  } catch (error) {
    console.error("Add to cart error:", error);
    throw error;
  }
}

async function getCart(customer_phone: string, merchant_id: string) {
  try {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone_number", customer_phone)
      .maybeSingle();

    if (!customer) {
      return {
        success: true,
        cart: null,
        message: "No cart found",
      };
    }

    const { data: cart } = await supabase
      .from("carts")
      .select("id, items, created_at")
      .eq("customer_id", customer.id)
      .eq("merchant_id", merchant_id)
      .maybeSingle();

    if (!cart) {
      return {
        success: true,
        cart: null,
        message: "No active cart",
      };
    }

    const items: CartItem[] = cart.items || [];

    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, currency")
      .in(
        "id",
        items.map((i) => i.product_id)
      );

    const cartDetails = items.map((item) => {
      const product = products?.find((p) => p.id === item.product_id);
      return {
        product_id: item.product_id,
        product_name: product?.name || "Unknown",
        quantity: item.quantity,
        price: product?.price || 0,
        currency: product?.currency || "USD",
        subtotal: (product?.price || 0) * item.quantity,
      };
    });

    const total = cartDetails.reduce((sum, item) => sum + item.subtotal, 0);
    const currency = cartDetails[0]?.currency || "USD";

    return {
      success: true,
      cart: {
        id: cart.id,
        items: cartDetails,
        total,
        currency,
        items_count: items.reduce((sum, i) => sum + i.quantity, 0),
      },
    };
  } catch (error) {
    console.error("Get cart error:", error);
    throw error;
  }
}

async function removeFromCart(
  customer_phone: string,
  merchant_id: string,
  product_id: string
) {
  try {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone_number", customer_phone)
      .maybeSingle();

    if (!customer) {
      return {
        success: false,
        error: "Customer not found",
      };
    }

    const { data: cart } = await supabase
      .from("carts")
      .select("id, items")
      .eq("customer_id", customer.id)
      .eq("merchant_id", merchant_id)
      .maybeSingle();

    if (!cart) {
      return {
        success: false,
        error: "Cart not found",
      };
    }

    const items: CartItem[] = (cart.items || []).filter(
      (i) => i.product_id !== product_id
    );

    await supabase.from("carts").update({ items }).eq("id", cart.id);

    return {
      success: true,
      message: "Item removed from cart",
    };
  } catch (error) {
    console.error("Remove from cart error:", error);
    throw error;
  }
}

async function clearCart(customer_phone: string, merchant_id: string) {
  try {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone_number", customer_phone)
      .maybeSingle();

    if (!customer) {
      return {
        success: false,
        error: "Customer not found",
      };
    }

    await supabase
      .from("carts")
      .update({ items: [] })
      .eq("customer_id", customer.id)
      .eq("merchant_id", merchant_id);

    return {
      success: true,
      message: "Cart cleared",
    };
  } catch (error) {
    console.error("Clear cart error:", error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: CartRequest = await req.json();
    let result;

    switch (body.action) {
      case "add":
        result = await addToCart(
          body.customer_phone,
          body.merchant_id,
          body.product_id || "",
          body.quantity || 1
        );
        break;
      case "get":
        result = await getCart(body.customer_phone, body.merchant_id);
        break;
      case "remove":
        result = await removeFromCart(
          body.customer_phone,
          body.merchant_id,
          body.product_id || ""
        );
        break;
      case "clear":
        result = await clearCart(body.customer_phone, body.merchant_id);
        break;
      default:
        result = { success: false, error: "Invalid action" };
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
