import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import type {
  Book,
  BookCondition,
  BookFlag,
  Conversation,
  ListingType,
  Message,
  Order,
  OrderStatus,
  Rental,
  RentalStatus,
  RentalViolation,
  Review,
} from "../types/models";
import { useAuth } from "./AuthContext";

type BookContextType = {
  books: Book[];
  loading: boolean;
  fetchBooks: () => Promise<void>;
  addBook: (book: Book) => Promise<{ ok: boolean; error?: string }>;
  deleteBook: (bookId: string) => Promise<{ ok: boolean; error?: string }>;
  markAsSold: (bookId: string) => Promise<boolean>;
  clearAllBooks: () => Promise<void>;
  getReviews: (bookId: string) => Promise<Review[]>;
  addReview: (
    bookId: string,
    review: { rating: number; comment: string },
    user: { id: string; name: string | null }
  ) => Promise<boolean>;
  wishlist: string[];
  toggleWishlist: (bookId: string) => void;
  isWishlisted: (bookId: string) => boolean;
  clearWishlist: () => void;
  createOrder: (
    book: Book,
    buyer: { id: string; name: string | null },
    delivery?: { address_line: string; city: string; pincode: string; lat?: number; lng?: number }
  ) => Promise<{ ok: boolean; orderId?: string; error?: string }>;
  getOrdersForUser: (userId: string) => Promise<Order[]>;
  requestReturn: (orderId: string, reason?: string) => Promise<boolean>;
  setOrderReturnStatus: (
    orderId: string,
    status: "return_approved" | "return_rejected"
  ) => Promise<boolean>;
  updateOrderStatus: (
    orderId: string,
    status: "shipped" | "delivered"
  ) => Promise<boolean>;
  getMessages: (bookId: string, otherUserId?: string) => Promise<Message[]>;
  getConversations: () => Promise<Conversation[]>;
  getUnreadCount: () => Promise<number>;
  markMessagesAsRead: (bookId: string) => Promise<void>;
  sendMessage: (
    bookId: string,
    toUserId: string,
    text: string,
    bookTitle?: string
  ) => Promise<boolean>;
  getRentalsForUser: (userId: string) => Promise<Rental[]>;
  createRental: (
    book: Book,
    buyer: { id: string; name: string | null },
    startDate: string,
    dueDate: string,
    paymentIds?: { rental?: string; deposit?: string }
  ) => Promise<{ ok: boolean; rentalId?: string; error?: string }>;
  getViolationStatus: (userId: string) => Promise<RentalViolation | null>;
  requestRentalExtension: (
    rentalId: string,
    extraDays: number,
    extensionFee: number,
    paymentId?: string
  ) => Promise<boolean>;
  markRentalReturned: (
    rentalId: string,
    returnDate: string,
    returnImages?: string[],
    options?: { lateFee?: number; damageFee?: number }
  ) => Promise<boolean>;
  updateRentalStatus: (rentalId: string, status: RentalStatus) => Promise<boolean>;
  refreshRentalOverdueStatus: () => Promise<void>;
  refundRentalDeposit: (rentalId: string) => Promise<{ ok: boolean; error?: string }>;
  recordRentalViolation: (buyerId: string, type: "warning" | "restrict" | "block") => Promise<boolean>;
  getRentalTransactions: (rentalId: string) => Promise<{ type: string; amount_paise: number; notes: string | null; created_at: string }[]>;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

const STORAGE_WISHLIST = "bibliothek_wishlist";

function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((u): u is string => typeof u === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapRowToBook(row: Record<string, unknown>): Book {
  const notesVal = row.notes;
  const notes =
    typeof notesVal === "string" && notesVal.trim() !== ""
      ? notesVal.trim()
      : undefined;
  const listingType = (row.listing_type as ListingType) ?? "sell";
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    price: String(row.price ?? "0"),
    condition: (row.condition as BookCondition) ?? "Good",
    flags: (row.flags as BookFlag[]) ?? [],
    notes,
    images: parseImages(row.images),
    seller: {
      id: String(row.seller_id ?? ""),
      name: String(row.seller_name ?? "Unknown"),
      location: String(row.location ?? row.seller_location ?? ""),
      rating: 0,
      totalSales: 0,
    },
    reviews: [],
    sold: !!(row.sold_at != null && row.sold_at !== ""),
    listing_type: listingType,
    rental_days: row.rental_days != null ? Number(row.rental_days) : undefined,
    usage_rules: row.usage_rules != null ? String(row.usage_rules) : undefined,
    damage_penalty: row.damage_penalty != null ? Number(row.damage_penalty) : undefined,
    major_damage_penalty: row.major_damage_penalty != null ? Number(row.major_damage_penalty) : undefined,
    late_penalty_per_day: row.late_penalty_per_day != null ? Number(row.late_penalty_per_day) : undefined,
    security_deposit: row.security_deposit != null ? Number(row.security_deposit) : undefined,
    extension_days: row.extension_days != null ? Number(row.extension_days) : undefined,
    extension_fee: row.extension_fee != null ? Number(row.extension_fee) : undefined,
  };
}

export function BookProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Load wishlist from storage
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_WISHLIST);
        if (raw) setWishlist(JSON.parse(raw));
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_WISHLIST, JSON.stringify(wishlist)).catch(
      () => {}
    );
  }, [wishlist]);

  const fetchBooks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error.message);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => mapRowToBook(row as Record<string, unknown>));
    setBooks(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Refetch when logged-in user changes so each account sees the full marketplace
  useEffect(() => {
    if (user?.id != null) fetchBooks();
  }, [user?.id]);

  // ➕ Add Book to Supabase
  const addBook = async (book: Book): Promise<{ ok: boolean; error?: string }> => {
    const payload: Record<string, unknown> = {
      title: book.title,
      price: Number(book.price),
      condition: book.condition,
      flags: book.flags,
      notes: book.notes?.trim() || null,
      images: book.images,
      seller_id: book.seller.id,
      seller_name: book.seller.name,
      seller_location: book.seller.location,
      listing_type: book.listing_type ?? "sell",
    };
    if (book.listing_type === "rent") {
      payload.rental_days = book.rental_days ?? 0;
      payload.usage_rules = book.usage_rules ?? "";
      payload.damage_penalty = book.damage_penalty ?? 0;
      if (book.major_damage_penalty != null) payload.major_damage_penalty = book.major_damage_penalty;
      payload.late_penalty_per_day = book.late_penalty_per_day ?? 0;
      payload.security_deposit = book.security_deposit ?? 0;
      if (book.extension_days != null) payload.extension_days = book.extension_days;
      if (book.extension_fee != null) payload.extension_fee = book.extension_fee;
    }
    const { error } = await supabase.from("books").insert([payload]);

    if (error) {
      console.error("Insert error:", error.message);
      return { ok: false, error: error.message };
    }

    await fetchBooks();
    return { ok: true };
  };

  const deleteBook = async (bookId: string): Promise<{ ok: boolean; error?: string }> => {
    const { data, error } = await supabase
      .from("books")
      .delete()
      .eq("id", bookId)
      .select("id");
    if (error) {
      console.error("Delete book error:", error.message);
      return { ok: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { ok: false, error: "Listing not found or you don't have permission to delete it." };
    }
    await fetchBooks();
    return { ok: true };
  };

  const markAsSold = async (bookId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("books")
      .update({ sold_at: new Date().toISOString() })
      .eq("id", bookId);
    if (error) {
      console.error("Mark as sold error:", error.message);
      return false;
    }
    await fetchBooks();
    return true;
  };

  const getReviews = async (bookId: string): Promise<Review[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Get reviews error:", error.message);
      return [];
    }
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      userId: row.user_id != null ? String(row.user_id) : undefined,
      user: String(row.user_name ?? "Unknown"),
      rating: Number(row.rating) || 0,
      comment: String(row.comment ?? ""),
      createdAt: String(row.created_at ?? ""),
    }));
  };

  const addReview = async (
    bookId: string,
    review: { rating: number; comment: string },
    user: { id: string; name: string | null }
  ): Promise<boolean> => {
    const { error } = await supabase.from("reviews").insert([
      {
        book_id: bookId,
        user_id: user.id,
        user_name: user.name ?? "Unknown",
        rating: review.rating,
        comment: review.comment.trim() || "",
      },
    ]);
    if (error) {
      console.error("Add review error:", error.message);
      return false;
    }
    return true;
  };

  const clearAllBooks = async () => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) {
      console.error("Delete error: not authenticated");
      return;
    }
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("seller_id", userId);

    if (error) {
      console.error("Delete error:", error.message);
      return;
    }

    await fetchBooks();
  };

  const toggleWishlist = (bookId: string) => {
    setWishlist((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [bookId, ...prev]
    );
  };

  const isWishlisted = (bookId: string) => wishlist.includes(bookId);

  const clearWishlist = () => setWishlist([]);

  function mapRowToOrder(row: Record<string, unknown>): Order {
    return {
      id: String(row.id),
      buyer_id: String(row.buyer_id ?? ""),
      buyer_name: String(row.buyer_name ?? ""),
      book_id: String(row.book_id ?? ""),
      book_title: String(row.book_title ?? ""),
      seller_id: String(row.seller_id ?? ""),
      status: (row.status as OrderStatus) ?? "completed",
      return_reason: row.return_reason != null ? String(row.return_reason) : undefined,
      created_at: String(row.created_at ?? ""),
      delivery_address: row.delivery_address != null ? String(row.delivery_address) : undefined,
      delivery_city: row.delivery_city != null ? String(row.delivery_city) : undefined,
      delivery_pincode: row.delivery_pincode != null ? String(row.delivery_pincode) : undefined,
      delivery_phone: row.delivery_phone != null ? String(row.delivery_phone) : undefined,
      delivery_lat: row.delivery_lat != null ? Number(row.delivery_lat) : undefined,
      delivery_lng: row.delivery_lng != null ? Number(row.delivery_lng) : undefined,
    };
  }

  const createOrder = async (
    book: Book,
    buyer: { id: string; name: string | null },
    delivery?: { address_line: string; city: string; pincode: string; phone?: string; lat?: number; lng?: number }
  ): Promise<{ ok: boolean; orderId?: string; error?: string }> => {
    const payload: Record<string, unknown> = {
      buyer_id: buyer.id,
      buyer_name: buyer.name ?? "Buyer",
      book_id: book.id,
      book_title: book.title,
      seller_id: book.seller.id,
      status: "confirmed",
    };
    if (delivery) {
      payload.delivery_address = delivery.address_line;
      payload.delivery_city = delivery.city;
      payload.delivery_pincode = delivery.pincode;
      if (delivery.phone != null) payload.delivery_phone = delivery.phone;
      if (delivery.lat != null) payload.delivery_lat = delivery.lat;
      if (delivery.lng != null) payload.delivery_lng = delivery.lng;
    }
    const { data, error } = await supabase
      .from("orders")
      .insert([payload])
      .select("id")
      .single();
    if (error) {
      console.error("Create order error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, orderId: data?.id ? String(data.id) : undefined };
  };

  const getOrdersForUser = async (userId: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Get orders error:", error.message);
      return [];
    }
    return (data ?? []).map((row) =>
      mapRowToOrder(row as Record<string, unknown>)
    );
  };

  const requestReturn = async (orderId: string, reason?: string): Promise<boolean> => {
    const payload: { status: string; return_reason?: string } = { status: "return_requested" };
    if (reason != null && String(reason).trim() !== "") payload.return_reason = String(reason).trim();
    const { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)
      .in("status", ["completed", "confirmed", "shipped", "delivered"]);
    if (error) {
      console.error("Request return error:", error.message);
      return false;
    }
    return true;
  };

  const setOrderReturnStatus = async (
    orderId: string,
    status: "return_approved" | "return_rejected"
  ): Promise<boolean> => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("status", "return_requested");
    if (error) {
      console.error("Set return status error:", error.message);
      return false;
    }
    return true;
  };

  const getMessages = async (
    bookId: string,
    _otherUserId?: string
  ): Promise<Message[]> => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Get messages error:", error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        book_id: String(r.book_id ?? ""),
        book_title: r.book_title != null ? String(r.book_title) : undefined,
        from_user_id: String(r.from_user_id ?? ""),
        to_user_id: String(r.to_user_id ?? ""),
        text: String(r.text ?? ""),
        created_at: String(r.created_at ?? ""),
      };
    });
  };

  const getConversations = async (): Promise<Conversation[]> => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from("messages")
      .select("book_id, book_title, from_user_id, to_user_id, text, created_at")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get conversations error:", error.message);
      return [];
    }

    const byKey = new Map<string, { last: string; at: string; title: string }>();
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const bookId = String(r.book_id ?? "");
      const otherId =
        r.from_user_id === user.id
          ? String(r.to_user_id ?? "")
          : String(r.from_user_id ?? "");
      const key = `${bookId}\0${otherId}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          last: String(r.text ?? ""),
          at: String(r.created_at ?? ""),
          title: r.book_title != null ? String(r.book_title) : "Chat",
        });
      }
    }

    return Array.from(byKey.entries()).map(([key, v]) => {
      const [bookId, otherUserId] = key.split("\0");
      return {
        bookId,
        bookTitle: v.title,
        otherUserId,
        lastMessageText: v.last,
        lastMessageAt: v.at,
      };
    });
  };

  const getUnreadCount = async (): Promise<number> => {
    if (!user?.id) return 0;
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .is("read_at", null);
    if (error) {
      console.warn("Unread count error:", error.message);
      return 0;
    }
    return count ?? 0;
  };

  const markMessagesAsRead = async (bookId: string): Promise<void> => {
    if (!user?.id) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("book_id", bookId)
      .eq("to_user_id", user.id)
      .is("read_at", null);
  };

  const sendMessage = async (
    bookId: string,
    toUserId: string,
    text: string,
    bookTitle?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;
    const clean = text.trim();
    if (!clean) return false;

    const payload: Record<string, unknown> = {
      book_id: bookId,
      from_user_id: user.id,
      to_user_id: toUserId,
      text: clean,
    };
    if (bookTitle != null && bookTitle !== "") payload.book_title = bookTitle;

    const { error } = await supabase.from("messages").insert(payload);

    if (error) {
      console.error("Send message error:", error.message);
      return false;
    }

    supabase.functions
      .invoke("send-message-notification", {
        body: {
          to_user_id: toUserId,
          sender_name: user.name ?? "Someone",
          text: clean,
          book_title: bookTitle ?? undefined,
        },
      })
      .then(({ error: fnErr }) => {
        if (fnErr) console.warn("Push notification failed:", fnErr.message);
      });

    return true;
  };

  const updateOrderStatus = async (
    orderId: string,
    status: "shipped" | "delivered"
  ): Promise<boolean> => {
    const prev = status === "shipped" ? "confirmed" : "shipped";
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("status", prev);
    if (error) {
      console.error("Update order status error:", error.message);
      return false;
    }
    return true;
  };

  function mapRowToRental(row: Record<string, unknown>): Rental {
    return {
      id: String(row.id),
      book_id: String(row.book_id ?? ""),
      book_title: row.book_title != null ? String(row.book_title) : null,
      seller_id: String(row.seller_id ?? ""),
      buyer_id: String(row.buyer_id ?? ""),
      buyer_name: row.buyer_name != null ? String(row.buyer_name) : null,
      rental_days: Number(row.rental_days ?? 0),
      usage_rules: String(row.usage_rules ?? ""),
      damage_penalty: Number(row.damage_penalty ?? 0),
      late_penalty_per_day: Number(row.late_penalty_per_day ?? 0),
      rental_fee: Number(row.rental_fee ?? 0),
      security_deposit: Number(row.security_deposit ?? 0),
      extension_fee: row.extension_fee != null ? Number(row.extension_fee) : null,
      extension_days: row.extension_days != null ? Number(row.extension_days) : null,
      late_fee_charged: Number(row.late_fee_charged ?? 0),
      damage_fee_charged: Number(row.damage_fee_charged ?? 0),
      start_date: row.start_date != null ? String(row.start_date) : null,
      due_date: String(row.due_date ?? ""),
      return_date: row.return_date != null ? String(row.return_date) : null,
      extended_due_date: row.extended_due_date != null ? String(row.extended_due_date) : null,
      status: (row.status as RentalStatus) ?? "active",
      rental_payment_id: row.rental_payment_id != null ? String(row.rental_payment_id) : null,
      deposit_payment_id: row.deposit_payment_id != null ? String(row.deposit_payment_id) : null,
      deposit_refunded_at: row.deposit_refunded_at != null ? String(row.deposit_refunded_at) : null,
      extension_payment_id: row.extension_payment_id != null ? String(row.extension_payment_id) : null,
      penalty_payment_id: row.penalty_payment_id != null ? String(row.penalty_payment_id) : null,
      pre_rental_images: Array.isArray(row.pre_rental_images) ? (row.pre_rental_images as string[]) : null,
      return_images: Array.isArray(row.return_images) ? (row.return_images as string[]) : null,
      extension_used: Boolean(row.extension_used),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      delivery_address: row.delivery_address != null ? String(row.delivery_address) : null,
      delivery_city: row.delivery_city != null ? String(row.delivery_city) : null,
      delivery_pincode: row.delivery_pincode != null ? String(row.delivery_pincode) : null,
      delivery_phone: row.delivery_phone != null ? String(row.delivery_phone) : null,
      delivery_lat: row.delivery_lat != null ? Number(row.delivery_lat) : null,
      delivery_lng: row.delivery_lng != null ? Number(row.delivery_lng) : null,
    };
  }

  const getRentalsForUser = async (userId: string): Promise<Rental[]> => {
    await refreshRentalOverdueStatus();
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Get rentals error:", error.message);
      return [];
    }
    return (data ?? []).map((row) => mapRowToRental(row as Record<string, unknown>));
  };

  const createRental = async (
    book: Book,
    buyer: { id: string; name: string | null },
    startDate: string,
    dueDate: string,
    paymentIds?: { rental?: string; deposit?: string }
  ): Promise<{ ok: boolean; rentalId?: string; error?: string }> => {
    if (book.listing_type !== "rent") return { ok: false, error: "Not a rental listing" };
    const { data, error } = await supabase
      .from("rentals")
      .insert({
        book_id: book.id,
        book_title: book.title,
        seller_id: book.seller.id,
        buyer_id: buyer.id,
        buyer_name: buyer.name ?? "Buyer",
        rental_days: book.rental_days ?? 0,
        usage_rules: book.usage_rules ?? "",
        damage_penalty: book.damage_penalty ?? 0,
        late_penalty_per_day: book.late_penalty_per_day ?? 0,
        rental_fee: Number(book.price),
        security_deposit: book.security_deposit ?? 0,
        due_date: dueDate,
        start_date: startDate,
        status: "active",
        rental_payment_id: paymentIds?.rental ?? null,
        deposit_payment_id: paymentIds?.deposit ?? null,
        extension_used: false,
        pre_rental_images: book.images ?? [],
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      console.error("Create rental error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, rentalId: (data as { id: string })?.id };
  };

  const getViolationStatus = async (userId: string): Promise<RentalViolation | null> => {
    const { data, error } = await supabase
      .from("rental_violations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      user_id: String(row.user_id ?? ""),
      warning_count: Number(row.warning_count ?? 0),
      restricted_until: row.restricted_until != null ? String(row.restricted_until) : null,
      blocked: Boolean(row.blocked),
      updated_at: String(row.updated_at ?? ""),
    };
  };

  const requestRentalExtension = async (
    rentalId: string,
    extraDays: number,
    extensionFee: number,
    paymentId?: string
  ): Promise<boolean> => {
    const { data: rental } = await supabase.from("rentals").select("*").eq("id", rentalId).single();
    if (!rental || (rental as Record<string, unknown>).extension_used) return false;
    const due = (rental as Record<string, unknown>).extended_due_date ?? (rental as Record<string, unknown>).due_date;
    const dueDate = new Date(String(due));
    dueDate.setDate(dueDate.getDate() + extraDays);
    const { error } = await supabase
      .from("rentals")
      .update({
        extension_used: true,
        extension_days: extraDays,
        extension_fee: extensionFee,
        extended_due_date: dueDate.toISOString(),
        extension_payment_id: paymentId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rentalId);
    if (error) return false;
    if (extensionFee > 0 && paymentId) {
      await supabase.from("rental_transactions").insert({
        rental_id: rentalId,
        type: "extension_fee",
        amount_paise: Math.round(extensionFee * 100),
        razorpay_payment_id: paymentId,
        notes: `Extension ${extraDays} days`,
      });
    }
    return true;
  };

  const markRentalReturned = async (
    rentalId: string,
    returnDate: string,
    returnImages?: string[],
    options?: { lateFee?: number; damageFee?: number }
  ): Promise<boolean> => {
    const updates: Record<string, unknown> = {
      return_date: returnDate,
      status: "completed",
      updated_at: new Date().toISOString(),
    };
    if (returnImages?.length) updates.return_images = returnImages;
    if (options?.lateFee != null) updates.late_fee_charged = options.lateFee;
    if (options?.damageFee != null) updates.damage_fee_charged = options.damageFee;
    const { error } = await supabase.from("rentals").update(updates).eq("id", rentalId);
    if (error) return false;
    if (options?.lateFee != null && options.lateFee > 0) {
      await supabase.from("rental_transactions").insert({
        rental_id: rentalId,
        type: "late_fee",
        amount_paise: -Math.round(options.lateFee * 100),
        notes: "Deducted from deposit",
      });
    }
    if (options?.damageFee != null && options.damageFee > 0) {
      await supabase.from("rental_transactions").insert({
        rental_id: rentalId,
        type: "damage_fee",
        amount_paise: -Math.round(options.damageFee * 100),
        notes: "Deducted from deposit",
      });
    }
    await supabase.functions.invoke("refund-rental-deposit", { body: { rental_id: rentalId } });
    return true;
  };

  const triggerDepositRefund = async (rentalId: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.functions.invoke("refund-rental-deposit", {
      body: { rental_id: rentalId },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  };

  const refreshRentalOverdueStatus = async (): Promise<void> => {
    const now = new Date().toISOString();
    await supabase
      .from("rentals")
      .update({ status: "overdue", updated_at: now })
      .eq("status", "active")
      .lt("due_date", now)
      .is("extended_due_date", null);
    await supabase
      .from("rentals")
      .update({ status: "overdue", updated_at: now })
      .eq("status", "active")
      .not("extended_due_date", "is", null)
      .lt("extended_due_date", now);
  };

  const getRentalTransactions = async (
    rentalId: string
  ): Promise<{ type: string; amount_paise: number; notes: string | null; created_at: string }[]> => {
    const { data, error } = await supabase
      .from("rental_transactions")
      .select("type, amount_paise, notes, created_at")
      .eq("rental_id", rentalId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((row: Record<string, unknown>) => ({
      type: String(row.type ?? ""),
      amount_paise: Number(row.amount_paise ?? 0),
      notes: row.notes != null ? String(row.notes) : null,
      created_at: String(row.created_at ?? ""),
    }));
  };

  const recordRentalViolation = async (
    buyerId: string,
    _type: "warning" | "restrict" | "block"
  ): Promise<boolean> => {
    const { data: existing } = await supabase
      .from("rental_violations")
      .select("warning_count")
      .eq("user_id", buyerId)
      .maybeSingle();
    const count = (existing as { warning_count?: number } | null)?.warning_count ?? 0;
    const newCount = count + 1;
    const updates: Record<string, unknown> = {
      warning_count: newCount,
      updated_at: new Date().toISOString(),
    };
    if (newCount >= 5) updates.blocked = true;
    else if (newCount >= 3) {
      const restrictUntil = new Date();
      restrictUntil.setDate(restrictUntil.getDate() + 7);
      updates.restricted_until = restrictUntil.toISOString();
    }
    const { error } = await supabase.from("rental_violations").upsert(
      { user_id: buyerId, ...updates },
      { onConflict: "user_id" }
    );
    return !error;
  };

  const updateRentalStatus = async (rentalId: string, status: RentalStatus): Promise<boolean> => {
    const { error } = await supabase
      .from("rentals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", rentalId);
    return !error;
  };

  const value = useMemo(
    () => ({
      books,
      loading,
      fetchBooks,
      addBook,
      deleteBook,
      markAsSold,
      clearAllBooks,
      getReviews,
      addReview,
      wishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
      createOrder,
      getOrdersForUser,
      requestReturn,
      setOrderReturnStatus,
      updateOrderStatus,
      getMessages,
      getConversations,
      getUnreadCount,
      markMessagesAsRead,
      sendMessage,
      getRentalsForUser,
      createRental,
      getViolationStatus,
      requestRentalExtension,
      markRentalReturned,
      updateRentalStatus,
      refundRentalDeposit: triggerDepositRefund,
      refreshRentalOverdueStatus,
      getRentalTransactions,
      recordRentalViolation,
    }),
    [books, loading, wishlist]
  );

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
}

export function useBooks() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error("useBooks must be used within BookProvider");
  return ctx;
}
