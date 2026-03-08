/**
 * Phase 3: Razorpay payment flow.
 * - Buy: create order → checkout → verify → order + mark sold.
 * - Rental: create order (fee+deposit) → checkout → verify-razorpay-rental → rental row.
 */

import type { Book } from "@/src/types/models";
import { supabase } from "./supabaseClient";

export interface CreateRazorpayOrderResult {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
}

export interface PaymentSuccessPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
}

/**
 * Create a Razorpay order (server-side). Requires Edge Function and RAZORPAY_KEY_* secrets.
 */
const RAZORPAY_MIN_PAISE = 100;

export async function createRazorpayOrder(
  amountPaise: number,
  book: Book,
  receipt: string
): Promise<{ ok: true; data: CreateRazorpayOrderResult } | { ok: false; error: string }> {
  if (amountPaise < RAZORPAY_MIN_PAISE) {
    return { ok: false, error: "Amount must be at least Rs 1 (100 paise)." };
  }
  const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
    body: {
      amount: amountPaise,
      receipt,
      bookId: book.id,
      bookTitle: book.title,
      sellerId: book.seller?.id,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const err = (data as { error?: string })?.error;
  if (err) {
    return { ok: false, error: err };
  }

  const result = data as CreateRazorpayOrderResult;
  if (!result?.orderId || !result?.keyId) {
    return { ok: false, error: "Invalid response from server" };
  }

  return { ok: true, data: result };
}

/** Delivery address for order/rental. */
export interface DeliveryPayload {
  address_line: string;
  city: string;
  pincode: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

/**
 * Verify payment and create order + mark book sold. Call after Razorpay onSuccess.
 */
export async function verifyRazorpayPaymentAndComplete(
  payload: PaymentSuccessPayload,
  book: Book,
  buyer: { id: string; name: string | null },
  delivery?: DeliveryPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body: Record<string, unknown> = {
    razorpay_order_id: payload.razorpay_order_id,
    razorpay_payment_id: payload.razorpay_payment_id,
    bookId: book.id,
    bookTitle: book.title,
    buyerId: buyer.id,
    buyerName: buyer.name ?? "Buyer",
    sellerId: book.seller?.id ?? "",
  };
  if (delivery) {
    body.delivery_address = delivery.address_line;
    body.delivery_city = delivery.city;
    body.delivery_pincode = delivery.pincode;
    if (delivery.phone != null) body.delivery_phone = delivery.phone;
    if (delivery.lat != null) body.delivery_lat = delivery.lat;
    if (delivery.lng != null) body.delivery_lng = delivery.lng;
  }
  const { data, error } = await supabase.functions.invoke("verify-razorpay-payment", { body });
  if (error) {
    return { ok: false, error: error.message };
  }
  const err = (data as { error?: string })?.error;
  if (err) {
    return { ok: false, error: err };
  }
  return { ok: true };
}

/** Amount in paise (INR). Rs 1 = 100 paise. Min 100 paise for Razorpay. */
export function priceToPaise(price: string | number): number {
  const num = typeof price === "string" ? Number(price) : price;
  if (Number.isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

/** Create Razorpay order for an arbitrary amount (e.g. extension fee, penalty). */
export async function createRazorpayOrderAmount(
  amountPaise: number,
  receipt: string
): Promise<{ ok: true; data: CreateRazorpayOrderResult } | { ok: false; error: string }> {
  if (amountPaise < RAZORPAY_MIN_PAISE) {
    return { ok: false, error: "Amount must be at least Rs 1 (100 paise)." };
  }
  const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
    body: { amount: amountPaise, receipt },
  });
  if (error) return { ok: false, error: error.message };
  const err = (data as { error?: string })?.error;
  if (err) return { ok: false, error: err };
  const result = data as CreateRazorpayOrderResult;
  if (!result?.orderId || !result?.keyId) return { ok: false, error: "Invalid response" };
  return { ok: true, data: result };
}

/** Create Razorpay order for rental (rental fee + security deposit). */
export async function createRazorpayOrderForRental(
  rentalFeePaise: number,
  depositPaise: number,
  book: Book,
  receipt: string
): Promise<{ ok: true; data: CreateRazorpayOrderResult } | { ok: false; error: string }> {
  const amountPaise = rentalFeePaise + depositPaise;
  return createRazorpayOrder(amountPaise, book, receipt);
}

/** Verify rental payment and create rental (called after Razorpay success). */
export async function verifyRazorpayRentalAndComplete(
  payload: PaymentSuccessPayload,
  book: Book,
  buyer: { id: string; name: string | null },
  delivery?: DeliveryPayload
): Promise<{ ok: true; rentalId: string } | { ok: false; error: string }> {
  const body: Record<string, unknown> = {
    razorpay_order_id: payload.razorpay_order_id,
    razorpay_payment_id: payload.razorpay_payment_id,
    book_id: book.id,
    book_title: book.title,
    seller_id: book.seller?.id ?? "",
    buyer_id: buyer.id,
    buyer_name: buyer.name ?? "Buyer",
    rental_days: book.rental_days ?? 0,
    usage_rules: book.usage_rules ?? "",
    damage_penalty: book.damage_penalty ?? 0,
    late_penalty_per_day: book.late_penalty_per_day ?? 0,
    rental_fee: Number(book.price),
    security_deposit: book.security_deposit ?? 0,
    start_date: new Date().toISOString(),
    due_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + (book.rental_days ?? 0));
      return d.toISOString();
    })(),
    pre_rental_images: book.images ?? [],
  };
  if (book.extension_days != null) body.extension_days = book.extension_days;
  if (book.extension_fee != null) body.extension_fee = book.extension_fee;
  if (delivery) {
    body.delivery_address = delivery.address_line;
    body.delivery_city = delivery.city;
    body.delivery_pincode = delivery.pincode;
    if (delivery.phone != null) body.delivery_phone = delivery.phone;
    if (delivery.lat != null) body.delivery_lat = delivery.lat;
    if (delivery.lng != null) body.delivery_lng = delivery.lng;
  }
  const { data, error } = await supabase.functions.invoke("verify-razorpay-rental", { body });
  if (error) return { ok: false, error: error.message };
  const err = (data as { error?: string })?.error;
  if (err) return { ok: false, error: err };
  const rentalId = (data as { rentalId?: string })?.rentalId;
  if (!rentalId) return { ok: false, error: "No rental id returned" };
  return { ok: true, rentalId };
}
