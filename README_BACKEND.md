# Bibliothek – Supabase backend setup (step by step)

Do these in order. You already have the `books` table and `book-images` bucket; this adds security and access rules.

---

## What you already have

- **Table `books`** with: `id`, `title`, `price`, `condition`, `flags`, `notes`, `images`, `seller_id`, `seller_name`, `seller_location`, `created_at`
- **Storage bucket** `book-images` for book photos

---

## Step 0: Create table and bucket (only if you haven’t)

Run this in the Supabase **SQL Editor** only if the table doesn’t exist yet:

```sql
-- Enable UUID extension (usually already on)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  price numeric NOT NULL,
  condition text,
  flags text[],
  images text[],
  seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_name text,
  seller_location text,
  created_at timestamp with time zone DEFAULT now()
);
```

Create the bucket in the dashboard: **Storage** → **New bucket** → name: `book-images`. You can leave it **private**; the policies below will allow read for everyone and upload only for the owner’s folder.

---

## Step 1: Run the migration (RLS + storage policies)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Open the file `supabase/migrations/001_books_rls_and_storage.sql` in your project, copy its full contents, and paste into the SQL Editor.
4. Click **Run**.

You should see “Success” with no errors. This migration:

- Enables **Row Level Security (RLS)** on `books`.
- Adds **policies** so that:
  - Everyone can **read** all books (browse).
  - Only **authenticated** users can **insert** a book, and only with `seller_id = auth.uid()`.
  - Users can **update** and **delete** only their own rows (`seller_id = auth.uid()`).
- Adds **indexes** on `seller_id` and `created_at` for faster queries.
- Adds **storage policies** on `book-images`:
  - **Select**: anyone can read (so listing images load).
  - **Insert**: authenticated users can upload only under a folder named with their user id (e.g. `{user_id}/{uuid}.jpg`).
  - **Delete**: users can delete only files under their own folder.

---

## Step 2: Check that the app matches the backend

Your app already:

- Inserts with `seller_id: book.seller.id` (and that id is the logged-in user’s id from Auth).
- Uploads images to `book-images` with path `{user.id}/{uuid}.{ext}`.

So no code change is required for the policies above. Just ensure:

- User is **logged in** when adding a book (so `seller_id` is set and matches `auth.uid()`).
- Image path in `AddBookScreen` stays in the form `{user.id}/...` (it does).

---

## Step 3: Optional – make bucket “public” for simpler image URLs

Right now the bucket can stay **private**; the storage policy allows read for everyone, so Supabase will still allow access when your app uses the URLs from `getPublicUrl()`.

If you prefer a **public** bucket (so the URL works like a normal public image):

1. **Storage** → **Policies** (or bucket **Settings**).
2. For `book-images`, set the bucket to **Public** if your project has that option.

Either way, the policies in the migration keep uploads restricted to the user’s own folder.

---

## Quick reference: who can do what

| Action        | Who can do it |
|---------------|----------------|
| List all books | Anyone (anon + authenticated) |
| Add a book     | Authenticated only; `seller_id` must be their user id |
| Edit a book   | Only the seller (`seller_id = auth.uid()`) |
| Delete a book | Only the seller |
| View images   | Anyone |
| Upload images | Authenticated; only under path `{their_user_id}/...` |
| Delete images | Authenticated; only under path `{their_user_id}/...` |

---

## If something breaks

- **“new row violates row-level security”** on insert  
  - User is not logged in, or you’re sending a `seller_id` that is not `auth.uid()`. In the app, `book.seller.id` must be the current user’s id.

- **Images don’t load**  
  - Make the bucket **public**: Dashboard → Storage → book-images → Settings → set to Public, so `getPublicUrl()` URLs work in the app. Also confirm policy `book_images_select_public` exists.

- **Upload fails**  
  - User must be authenticated. Path must start with `{user.id}/` (e.g. `user.id` from AuthContext).

Running the migration (Step 1) is enough to have the backend set up properly with RLS and storage security.

---

## Phase 2: Orders and returns

To enable orders and the return flow (Terms & Conditions, "My Orders", Request return):

1. In the SQL Editor, run the contents of `supabase/migrations/005_orders_table.sql`.
2. This creates the `orders` table (buyer_id, book_id, seller_id, status, etc.) and RLS so buyers and sellers only see their own orders and can request/approve returns.

To add the optional **seller notes** field (extra condition/notes for readers), run `supabase/migrations/006_books_add_notes.sql` in the SQL Editor.
