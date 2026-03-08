// Send push notification to the recipient when they receive a message.
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (to read push_tokens for recipient).

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  to_user_id: string;
  sender_name: string;
  text: string;
  book_title?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as Body;
    const { to_user_id, sender_name, text, book_title } = body;
    if (!to_user_id || !sender_name || text == null) {
      return new Response(
        JSON.stringify({ error: "Missing to_user_id, sender_name, or text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: rows, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", to_user_id);

    if (error || !rows?.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title = book_title
      ? `${sender_name} (${book_title})`
      : `Message from ${sender_name}`;
    const bodyText = text.length > 80 ? text.slice(0, 77) + "..." : text;

    const messages = (rows as { token: string }[]).map((r) => ({
      to: r.token,
      title,
      body: bodyText,
      sound: "default" as const,
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Expo push error:", res.status, errText);
      return new Response(
        JSON.stringify({ error: "Push delivery failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, sent: messages.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-message-notification error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
