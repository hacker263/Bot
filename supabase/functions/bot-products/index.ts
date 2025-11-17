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

interface ProductRequest {
  action: "list" | "get" | "search" | "by_category";
  merchant_id?: string;
  product_id?: string;
  query?: string;
  category?: string;
}

async function listProducts(merchant_id?: string) {
  try {
    let query = supabase
      .from("products")
      .select("id, name, description, price, currency, category, stock, image_url")
      .eq("is_active", true);

    if (merchant_id) {
      query = query.eq("merchant_id", merchant_id);
    }

    const { data: products, error } = await query.order("category", { ascending: true });

    if (error) throw error;

    const grouped = (products || []).reduce(
      (acc, product) => {
        const category = product.category || "Other";
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      },
      {} as Record<string, typeof products>
    );

    return {
      success: true,
      products: grouped,
      count: products?.length || 0,
    };
  } catch (error) {
    console.error("List products error:", error);
    throw error;
  }
}

async function getProduct(product_id: string) {
  try {
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (error) throw error;

    return {
      success: true,
      product,
    };
  } catch (error) {
    console.error("Get product error:", error);
    throw error;
  }
}

async function searchProducts(query: string, merchant_id?: string) {
  try {
    let searchQuery = supabase
      .from("products")
      .select("id, name, description, price, currency, category, stock, image_url, merchant_id")
      .eq("is_active", true)
      .ilike("name", `%${query}%`);

    if (merchant_id) {
      searchQuery = searchQuery.eq("merchant_id", merchant_id);
    }

    const { data: products, error } = await searchQuery.limit(20);

    if (error) throw error;

    return {
      success: true,
      results: products || [],
      count: products?.length || 0,
    };
  } catch (error) {
    console.error("Search products error:", error);
    throw error;
  }
}

async function getProductsByCategory(category: string, merchant_id?: string) {
  try {
    let query = supabase
      .from("products")
      .select("id, name, description, price, currency, category, stock, image_url")
      .eq("is_active", true)
      .eq("category", category);

    if (merchant_id) {
      query = query.eq("merchant_id", merchant_id);
    }

    const { data: products, error } = await query.order("name", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      products,
      category,
      count: products?.length || 0,
    };
  } catch (error) {
    console.error("Get products by category error:", error);
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
    const body: ProductRequest = await req.json();
    let result;

    switch (body.action) {
      case "list":
        result = await listProducts(body.merchant_id);
        break;
      case "get":
        result = await getProduct(body.product_id || "");
        break;
      case "search":
        result = await searchProducts(body.query || "", body.merchant_id);
        break;
      case "by_category":
        result = await getProductsByCategory(body.category || "", body.merchant_id);
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
