// Verify Razorpay payment and on success create order + mark book sold.
// Requires env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const RAZORPAY_PAYMENTS_URL = "https://api.razorpay.com/v1/payments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  bookId: string;
  bookTitle: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
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
    const body = (await req.json()) as VerifyBody;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      bookId,
      bookTitle,
      buyerId,
      buyerName,
      sellerId,
      delivery_address,
      delivery_city,
      delivery_pincode,
      delivery_phone,
      delivery_lat,
      delivery_lng,
    } = body;

    if (!razorpay_payment_id || !bookId || !buyerId || !sellerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment with Razorpay
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

    // Create Supabase client with service role (bypass RLS)
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const orderRow: Record<string, unknown> = {
      buyer_id: buyerId,
      buyer_name: buyerName || "Buyer",
      book_id: bookId,
      book_title: bookTitle,
      seller_id: sellerId,
      status: "confirmed",
    };
    if (delivery_address != null) orderRow.delivery_address = delivery_address;
    if (delivery_city != null) orderRow.delivery_city = delivery_city;
    if (delivery_pincode != null) orderRow.delivery_pincode = delivery_pincode;
    if (delivery_phone != null) orderRow.delivery_phone = delivery_phone;
    if (delivery_lat != null) orderRow.delivery_lat = delivery_lat;
    if (delivery_lng != null) orderRow.delivery_lng = delivery_lng;
    const { error: orderError } = await supabase.from("orders").insert(orderRow);

    if (orderError) {
      return new Response(
        JSON.stringify({ error: "Failed to create order: " + orderError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark book as sold
    const { error: updateError } = await supabase
      .from("books")
      .update({ sold_at: new Date().toISOString() })
      .eq("id", bookId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Order created but failed to mark book sold: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
