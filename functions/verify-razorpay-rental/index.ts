// Verify Razorpay payment and create rental (rental fee + deposit in one payment).
// Requires env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const RAZORPAY_PAYMENTS_URL = "https://api.razorpay.com/v1/payments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRentalBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  book_id: string;
  book_title: string;
  seller_id: string;
  buyer_id: string;
  buyer_name: string;
  rental_days: number;
  usage_rules: string;
  damage_penalty: number;
  late_penalty_per_day: number;
  rental_fee: number;
  security_deposit: number;
  start_date: string;
  due_date: string;
  pre_rental_images?: string[];
  extension_days?: number;
  extension_fee?: number;
  delivery_address?: string;
  delivery_city?: string;
  delivery_pincode?: string;
  delivery_phone?: string;
  delivery_lat?: number;
  delivery_lng?: number;
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
    const body = (await req.json()) as VerifyRentalBody;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      book_id,
      book_title,
      seller_id,
      buyer_id,
      buyer_name,
      rental_days,
      usage_rules,
      damage_penalty,
      late_penalty_per_day,
      rental_fee,
      security_deposit,
      start_date,
      due_date,
      pre_rental_images,
      extension_days,
      extension_fee,
      delivery_address,
      delivery_city,
      delivery_pincode,
      delivery_phone,
      delivery_lat,
      delivery_lng,
    } = body;

    if (!razorpay_payment_id || !book_id || !buyer_id || !seller_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = btoa(`${keyId}:${keySecret}`);
    const payRes = await fetch(`${RAZORPAY_PAYMENTS_URL}/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const payment = await payRes.json();

    if (!payRes.ok || payment.status !== "captured") {
      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment.order_id !== razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: "Order id mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rentalRowInsert: Record<string, unknown> = {
        book_id,
        book_title: book_title || "Book",
        seller_id,
        buyer_id,
        buyer_name: buyer_name || "Buyer",
        rental_days: rental_days ?? 0,
        usage_rules: usage_rules || "",
        damage_penalty: damage_penalty ?? 0,
        late_penalty_per_day: late_penalty_per_day ?? 0,
        rental_fee: rental_fee ?? 0,
        security_deposit: security_deposit ?? 0,
        start_date: start_date || new Date().toISOString(),
        due_date: due_date || new Date().toISOString(),
        status: "active",
        rental_payment_id: razorpay_payment_id,
        deposit_payment_id: razorpay_payment_id,
        extension_used: false,
        pre_rental_images: pre_rental_images ?? [],
        updated_at: new Date().toISOString(),
      };
    if (extension_days != null) rentalRowInsert.extension_days = extension_days;
    if (extension_fee != null) rentalRowInsert.extension_fee = extension_fee;
    if (delivery_address != null) rentalRowInsert.delivery_address = delivery_address;
    if (delivery_city != null) rentalRowInsert.delivery_city = delivery_city;
    if (delivery_pincode != null) rentalRowInsert.delivery_pincode = delivery_pincode;
    if (delivery_phone != null) rentalRowInsert.delivery_phone = delivery_phone;
    if (delivery_lat != null) rentalRowInsert.delivery_lat = delivery_lat;
    if (delivery_lng != null) rentalRowInsert.delivery_lng = delivery_lng;
    const { data: rentalRow, error: rentalError } = await supabase
      .from("rentals")
      .insert(rentalRowInsert)
      .select("id")
      .single();

    if (rentalError) {
      return new Response(
        JSON.stringify({ error: "Failed to create rental: " + rentalError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rentalId = (rentalRow as { id: string })?.id;
    const amountPaise = Math.round((Number(rental_fee) + Number(security_deposit)) * 100);
    await supabase.from("rental_transactions").insert({
      rental_id: rentalId,
      type: "rental_payment",
      amount_paise: amountPaise,
      razorpay_payment_id: razorpay_payment_id,
      notes: "Rental fee + security deposit",
    });

    return new Response(
      JSON.stringify({ ok: true, rentalId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
