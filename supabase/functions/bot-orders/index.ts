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

interface OrderRequest {
  action: "create" | "get" | "update_status" | "list";
  merchant_id?: string;
  customer_phone?: string;
  order_id?: string;
  items?: Array<{ product_id: string; quantity: number; price: number }>;
  total_amount?: number;
  currency?: string;
  status?: string;
  payment_method?: string;
}

async function createOrder(req: OrderRequest) {
  try {
    const { merchant_id, customer_phone, items, total_amount, currency, payment_method } = req;

    let customer_id = null;
    if (customer_phone) {
      const { data: customer } = await supabase
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
        customer_id = newCustomer?.id;
      } else {
        customer_id = customer.id;
      }
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          merchant_id,
          customer_id,
          items,
          total_amount,
          currency,
          payment_method,
          status: "pending",
          payment_status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      order_id: order.id,
      message: "Order created successfully",
    };
  } catch (error) {
    console.error("Create order error:", error);
    throw error;
  }
}

async function getOrder(order_id: string) {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, payment_status, items, total_amount, currency, created_at, updated_at")
      .eq("id", order_id)
      .single();

    if (error) throw error;

    return {
      success: true,
      order,
    };
  } catch (error) {
    console.error("Get order error:", error);
    throw error;
  }
}

async function updateOrderStatus(order_id: string, status: string) {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", order_id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `Order status updated to ${status}`,
      order,
    };
  } catch (error) {
    console.error("Update order error:", error);
    throw error;
  }
}

async function listMerchantOrders(merchant_id: string, status?: string) {
  try {
    let query = supabase
      .from("orders")
      .select("id, customer_id, items, total_amount, currency, status, payment_status, created_at")
      .eq("merchant_id", merchant_id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return {
      success: true,
      orders,
      count: orders?.length || 0,
    };
  } catch (error) {
    console.error("List orders error:", error);
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
    const body: OrderRequest = await req.json();
    let result;

    switch (body.action) {
      case "create":
        result = await createOrder(body);
        break;
      case "get":
        result = await getOrder(body.order_id || "");
        break;
      case "update_status":
        result = await updateOrderStatus(body.order_id || "", body.status || "pending");
        break;
      case "list":
        result = await listMerchantOrders(body.merchant_id || "", body.status);
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
