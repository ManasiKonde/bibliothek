import { supabase } from "@/src/lib/supabaseClient";
import type { Book } from "@/src/types/models";

// 1) CREATE / INSERT BOOK
export async function createBook(book: Omit<Book, "id">) {
  // map your app model -> db columns
  const payload = {
    title: book.title,
    price: Number(book.price),
    condition: book.condition,
    flags: book.flags ?? [],
    images: book.images ?? [],
    seller_id: book.seller.id, // MUST match auth user id
  };

  const { data, error } = await supabase
    .from("books")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// 2) READ / GET ALL BOOKS
export async function getAllBooks() {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
