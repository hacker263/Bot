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

interface MessageRequest {
  action: "save" | "get_session" | "clear_session";
  customer_phone: string;
  merchant_id?: string;
  message_content?: string;
  direction?: "incoming" | "outgoing";
  message_type?: string;
}

async function saveMessage(
  customer_phone: string,
  merchant_id: string | undefined,
  content: string,
  direction: string
) {
  try {
    let { data: session } = await supabase
      .from("conversation_sessions")
      .select("id")
      .eq("customer_phone", customer_phone)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from("conversation_sessions")
        .insert([
          {
            customer_phone,
            merchant_id,
            conversation_state: { step: "welcome", context: {} },
          },
        ])
        .select()
        .single();

      if (sessionError) throw sessionError;
      session = newSession;
    }

    const { error: messageError } = await supabase
      .from("bot_messages")
      .insert([
        {
          conversation_session_id: session.id,
          direction,
          message_type: "text",
          content,
        },
      ]);

    if (messageError) throw messageError;

    await supabase
      .from("conversation_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", session.id);

    return {
      success: true,
      session_id: session.id,
      message: "Message saved",
    };
  } catch (error) {
    console.error("Save message error:", error);
    throw error;
  }
}

async function getConversationSession(customer_phone: string) {
  try {
    const { data: session, error } = await supabase
      .from("conversation_sessions")
      .select("id, conversation_state, merchant_id")
      .eq("customer_phone", customer_phone)
      .gte("expires_at", new Date().toISOString())
      .order("last_message_at", { ascending: false })
      .maybeSingle();

    if (error) throw error;

    if (!session) {
      return {
        success: true,
        session: null,
        message: "No active session",
      };
    }

    const { data: messages } = await supabase
      .from("bot_messages")
      .select("direction, content, message_type, created_at")
      .eq("conversation_session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      success: true,
      session: {
        id: session.id,
        state: session.conversation_state,
        merchant_id: session.merchant_id,
        recent_messages: messages,
      },
    };
  } catch (error) {
    console.error("Get session error:", error);
    throw error;
  }
}

async function clearSession(customer_phone: string) {
  try {
    const { error } = await supabase
      .from("conversation_sessions")
      .update({ expires_at: new Date().toISOString() })
      .eq("customer_phone", customer_phone);

    if (error) throw error;

    return {
      success: true,
      message: "Session cleared",
    };
  } catch (error) {
    console.error("Clear session error:", error);
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
    const body: MessageRequest = await req.json();
    let result;

    switch (body.action) {
      case "save":
        result = await saveMessage(
          body.customer_phone,
          body.merchant_id,
          body.message_content || "",
          body.direction || "incoming"
        );
        break;
      case "get_session":
        result = await getConversationSession(body.customer_phone);
        break;
      case "clear_session":
        result = await clearSession(body.customer_phone);
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
