export type Review = {
  id: string;
  userId?: string; // for "already reviewed" check
  user: string;
  rating: number; // 1..5
  comment: string;
  createdAt: string;
};

export type Seller = {
  id: string;
  name: string;
  location: string;
  rating: number; // 0..5
  totalSales: number;
};

// Controlled condition options (reader-friendly + consistent)
export type BookCondition =
  | "Like New"
  | "Very Good"
  | "Good"
  | "Used"
  | "Acceptable"
  | "Annotated"
  | "Dog-eared";

// Reader-first damage flags (checkbox-style)
export type BookFlag =
  | "Highlights"
  | "Annotations"
  | "Torn Pages"
  | "Dog-eared Pages"
  | "Water Damage"
  | "Loose Binding"
  | "Missing Pages"
  | "Cover Damage";

export type ListingType = "sell" | "rent";

export type Book = {
  id: string;
  title: string;
  price: string; // sell: sale price; rent: rental fee per period

  condition: BookCondition;
  flags: BookFlag[];
  notes?: string;
  images: string[];
  seller: Seller;
  reviews: Review[];
  sold?: boolean;

  /** 'sell' (default) or 'rent' */
  listing_type?: ListingType;
  /** Required when listing_type === 'rent' */
  rental_days?: number;
  usage_rules?: string;
  damage_penalty?: number;
  /** Optional: major damage (e.g. significant damage); total loss = full book value */
  major_damage_penalty?: number;
  late_penalty_per_day?: number;
  security_deposit?: number;
  /** Optional: extension offered once per rental */
  extension_days?: number;
  extension_fee?: number;
};

export type RentalStatus = "active" | "overdue" | "completed" | "blocked";

export interface Rental {
  id: string;
  book_id: string;
  book_title: string | null;
  seller_id: string;
  buyer_id: string;
  buyer_name: string | null;
  rental_days: number;
  usage_rules: string;
  damage_penalty: number;
  late_penalty_per_day: number;
  rental_fee: number;
  security_deposit: number;
  extension_fee: number | null;
  extension_days: number | null;
  late_fee_charged: number;
  damage_fee_charged: number;
  start_date: string | null;
  due_date: string;
  return_date: string | null;
  extended_due_date: string | null;
  status: RentalStatus;
  rental_payment_id: string | null;
  deposit_payment_id: string | null;
  deposit_refunded_at: string | null;
  extension_payment_id: string | null;
  penalty_payment_id: string | null;
  pre_rental_images: string[] | null;
  return_images: string[] | null;
  extension_used: boolean;
  created_at: string;
  updated_at: string;
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_pincode?: string | null;
  delivery_phone?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
}

export interface RentalViolation {
  user_id: string;
  warning_count: number;
  restricted_until: string | null;
  blocked: boolean;
  updated_at: string;
}

export type OrderStatus =
  | "completed"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "return_requested"
  | "return_approved"
  | "return_rejected";

export interface DeliveryAddress {
  address_line: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

export type Order = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  book_id: string;
  book_title: string;
  seller_id: string;
  status: OrderStatus;
  return_reason?: string;
  created_at: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_pincode?: string;
  delivery_phone?: string;
  delivery_lat?: number;
  delivery_lng?: number;
};

export interface Message {
  id: string;
  book_id: string;
  book_title?: string;
  from_user_id: string;
  to_user_id: string;
  text: string;
  created_at: string;
}

export interface Conversation {
  bookId: string;
  bookTitle: string;
  otherUserId: string;
  lastMessageText: string;
  lastMessageAt: string;
}
