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

interface AuthRequest {
  action: "register" | "login" | "verify";
  phone_number: string;
  name?: string;
  email?: string;
  role?: "customer" | "merchant" | "super_admin";
  password?: string;
}

async function registerUser(req: AuthRequest) {
  try {
    const { phone_number, name, email, role = "customer" } = req;

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: "Phone number already registered",
        code: "USER_EXISTS",
      };
    }

    const { data, error } = await supabase.from("users").insert([
      {
        phone_number,
        name,
        email,
        role,
        whatsapp_verified: true,
      },
    ]);

    if (error) {
      return { success: false, error: error.message, code: "INSERT_ERROR" };
    }

    if (role === "merchant") {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phone_number)
        .single();

      if (userData) {
        await supabase.from("merchants").insert([
          {
            user_id: userData.id,
            business_name: name || "New Business",
            region: phone_number.startsWith("27") ? "ZA" : "ZW",
            currency: phone_number.startsWith("27") ? "ZAR" : "USD",
          },
        ]);
      }
    }

    return {
      success: true,
      message: "User registered successfully",
      role,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
      code: "REGISTER_ERROR",
    };
  }
}

async function verifyUser(phone_number: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, phone_number, role, profile_data")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
    }

    return {
      success: true,
      user: {
        id: data.id,
        phone_number: data.phone_number,
        role: data.role,
        preferences: data.profile_data?.preferences || {},
      },
    };
  } catch (error) {
    console.error("Verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
      code: "VERIFY_ERROR",
    };
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
    const body: AuthRequest = await req.json();
    let result;

    switch (body.action) {
      case "register":
        result = await registerUser(body);
        break;
      case "verify":
        result = await verifyUser(body.phone_number);
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
