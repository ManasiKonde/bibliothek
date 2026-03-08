// Refund security deposit (or deposit minus penalties). Partial refund of the rental payment.
// Requires env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const RAZORPAY_REFUND_URL = "https://api.razorpay.com/v1/payments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundBody {
  rental_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!keyId || !keySecret || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as RefundBody;
    const { rental_id } = body;
    if (!rental_id) {
      return new Response(
        JSON.stringify({ error: "Missing rental_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: rental, error: fetchErr } = await supabase
      .from("rentals")
      .select("rental_payment_id, security_deposit, late_fee_charged, damage_fee_charged, deposit_refunded_at")
      .eq("id", rental_id)
      .single();

    if (fetchErr || !rental) {
      return new Response(
        JSON.stringify({ error: "Rental not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r = rental as Record<string, unknown>;
    if (r.deposit_refunded_at) {
      return new Response(
        JSON.stringify({ ok: true, message: "Already refunded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = String(r.rental_payment_id ?? "");
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "No payment id on rental" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deposit = Number(r.security_deposit ?? 0);
    const lateFee = Number(r.late_fee_charged ?? 0);
    const damageFee = Number(r.damage_fee_charged ?? 0);
    const refundAmount = Math.max(0, deposit - lateFee - damageFee);
    const refundPaise = Math.round(refundAmount * 100);

    if (refundPaise < 100) {
      await supabase
        .from("rentals")
        .update({
          deposit_refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rental_id);
      return new Response(
        JSON.stringify({ ok: true, refunded: 0, message: "No refund (deductions >= deposit)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = btoa(`${keyId}:${keySecret}`);
    const refundRes = await fetch(`${RAZORPAY_REFUND_URL}/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ amount: refundPaise, notes: { rental_id } }),
    });

    const refundData = await refundRes.json();
    if (!refundRes.ok) {
      return new Response(
        JSON.stringify({ error: refundData.error?.description ?? "Refund failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("rentals")
      .update({
        deposit_refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rental_id);

    await supabase.from("rental_transactions").insert({
      rental_id,
      type: "deposit_refund",
      amount_paise: -refundPaise,
      razorpay_payment_id: paymentId,
      razorpay_refund_id: refundData.id ?? null,
      notes: `Refund Rs ${refundAmount} (deposit minus late/damage)`,
    });

    return new Response(
      JSON.stringify({ ok: true, refunded: refundAmount, refund_id: refundData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
