// Find rentals due in 1-2 days and send push reminder to buyer.
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const now = new Date();
  const inTwoDays = new Date(now);
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  const inOneDay = new Date(now);
  inOneDay.setDate(inOneDay.getDate() + 1);

  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: byDue } = await supabase
    .from("rentals")
    .select("id, book_title, due_date, extended_due_date, buyer_id")
    .eq("status", "active")
    .lte("due_date", inTwoDays.toISOString())
    .gte("due_date", now.toISOString());
  const { data: byExtended } = await supabase
    .from("rentals")
    .select("id, book_title, due_date, extended_due_date, buyer_id")
    .eq("status", "active")
    .not("extended_due_date", "is", null)
    .lte("extended_due_date", inTwoDays.toISOString())
    .gte("extended_due_date", now.toISOString());
  const seen = new Set<string>();
  const rentals: { id: string; book_title: string; due_date: string; extended_due_date: string | null; buyer_id: string }[] = [];
  for (const r of [...(byDue ?? []), ...(byExtended ?? [])]) {
    const row = r as { id: string; book_title: string; due_date: string; extended_due_date: string | null; buyer_id: string };
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const effectiveDue = row.extended_due_date ?? row.due_date;
    const d = new Date(effectiveDue);
    if (d >= now && d <= inTwoDays) rentals.push(row);
  }

  if (!rentals?.length) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const buyerIds = [...new Set((rentals as { buyer_id: string }[]).map((r) => r.buyer_id))];
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", buyerIds);

  const tokenByUser = new Map<string, string>();
  for (const row of tokens ?? []) {
    const r = row as { user_id: string; token: string };
    tokenByUser.set(r.user_id, r.token);
  }

  const messages: { to: string; title: string; body: string }[] = [];
  for (const r of rentals as { book_title: string; due_date: string; extended_due_date: string | null; buyer_id: string }[]) {
    const due = r.extended_due_date ?? r.due_date;
    const dueDate = new Date(due).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const token = tokenByUser.get(r.buyer_id);
    if (token) {
      messages.push({
        to: token,
        title: "Rental due soon",
        body: `Return "${r.book_title ?? "Book"}" by ${dueDate}`,
      });
    }
  }

  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Push send failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, sent: messages.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
