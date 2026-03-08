// Create a Razorpay order (server-side; keeps secret key safe).
// Requires env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderBody {
  amount: number; // in paise (INR)
  receipt: string;
  bookId?: string;
  bookTitle?: string;
  sellerId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    return new Response(
      JSON.stringify({ error: "Razorpay keys not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as CreateOrderBody;
    const amount = Number(body.amount);
    const receipt = String(body.receipt || `receipt_${Date.now()}`);

    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (min 100 paise)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const razorpayBody = {
      amount: Math.round(amount),
      currency: "INR",
      receipt: receipt.slice(0, 40),
      notes: {
        book_id: (body.bookId || "").slice(0, 256),
        book_title: (body.bookTitle || "").slice(0, 256),
        seller_id: (body.sellerId || "").slice(0, 256),
      },
    };

    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch(RAZORPAY_ORDERS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(razorpayBody),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.description || "Razorpay order failed" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        orderId: data.id,
        keyId,
        amount: data.amount,
        currency: data.currency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
