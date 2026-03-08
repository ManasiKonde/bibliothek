# Bibliothek

A React Native (Expo) marketplace app for buying, selling, and renting second-hand books. Users can list books with condition and damage flags, browse and filter listings, message sellers, pay via Razorpay, and manage orders and rentals (including extensions and returns).

**Tagline:** *Where the stories travel.*

---

## Features

- **Auth** – Sign up / login with email (Supabase Auth). Profile: name, location, delivery address.
- **Books** – List books for **sell** or **rent** with title, price, condition, damage flags, notes, images. Edit/delete and mark as sold.
- **Home** – Browse others’ listings with search, condition filter, and price sort. Unread message count badge.
- **Wishlist** – Save books locally (AsyncStorage); clear from profile.
- **Buy flow** – Book detail → Checkout (address, pincode, delivery check) → Razorpay → Order created, book marked sold.
- **Rent flow** – Book detail → Rent (fee + security deposit) → Razorpay → Rental created. Extend rental (fee), return with photos, late/damage fees, deposit refund.
- **Orders** – List orders; seller can mark shipped/delivered; buyer can request return (with reason); seller can approve/reject return.
- **Rentals** – List active/overdue/completed rentals; extension, return, payment history, violation status.
- **Messages** – Per-book conversations between buyer and seller; unread count; inbox list.
- **Payments** – Razorpay for purchase, rental (fee + deposit), and rental extension. Edge Functions create orders and verify payments.
- **Delivery** – Pincode-based delivery check (configurable list of serviceable pincodes).
- **Push** – Optional push notification registration (development build; skipped in Expo Go).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| App | React Native (Expo SDK 54), TypeScript, expo-router |
| UI | React Navigation (tabs + stack), react-native-safe-area-context, Ionicons, Moti (login/signup) |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Payments | Razorpay via Supabase Edge Functions |
| State | React Context (AuthContext, BookContext) |
| Storage | AsyncStorage (session, wishlist) |

---

## Project Structure

```
bibliothek/
├── app/                    # expo-router screens
│   ├── _layout.tsx         # Root: AuthProvider, BookProvider, Stack (tabs | auth)
│   ├── (tabs)/             # Main tabs: Home, Sell, Wishlist, Profile
│   │   ├── index.tsx       # Home (browse books)
│   │   ├── sell.tsx        # Sell (wraps AddBookScreen)
│   │   ├── wishlist.tsx
│   │   └── profile.tsx
│   ├── (auth)/             # Login, Signup
│   ├── book/[id].tsx       # Book detail (buy/rent, wishlist, reviews, message)
│   ├── checkout/[id].tsx   # Buy checkout + Razorpay
│   ├── rent-checkout/[id].tsx  # Rent checkout + Razorpay
│   ├── order/[id].tsx      # Order detail (seller/buyer actions)
│   ├── orders.tsx          # Orders list
│   ├── rental/[id].tsx     # Rental detail (extend, return, transactions)
│   ├── rentals.tsx         # Rentals list
│   ├── inbox.tsx           # Conversations list
│   ├── messages/[bookId].tsx  # Chat for a book
│   ├── about.tsx, faq.tsx, terms.tsx
│   └── modal.tsx
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx   # User, login/signup/logout, profile fields, push
│   │   └── BookContext.tsx   # Books, wishlist, orders, rentals, messages, payments
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── payment.ts        # Razorpay order/verify (buy, rental, amount)
│   │   ├── delivery.ts       # Pincode deliverability
│   │   ├── validation.ts     # Email etc.
│   │   └── pushNotifications.ts
│   ├── services/
│   │   └── bookService.ts    # createBook, getAllBooks (used by context)
│   ├── screens/
│   │   └── AddBookScreen.tsx # List/edit book (sell or rent)
│   └── types/
│       └── models.ts         # Book, Order, Rental, Message, Review, etc.
├── components/              # Shared UI (e.g. Screen, themed components)
├── hooks/
├── assets/
├── supabase/
│   ├── migrations/          # SQL migrations (books, orders, rentals, messages, etc.)
│   ├── functions/           # Edge Functions (create-razorpay-order, verify-razorpay-*)
│   └── README_BACKEND.md    # Backend setup steps
├── app.json
├── package.json
└── tsconfig.json
```

---

## Prerequisites

- Node.js (LTS)
- npm or yarn
- Expo Go (for quick dev) or EAS Build for production (Razorpay, push)
- Supabase project
- Razorpay account (test/live keys)

---

## Environment Variables

Create a `.env` in the project root (and set the same in EAS/CI for builds):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Supabase Edge Functions need Razorpay keys (set in Supabase Dashboard → Project Settings → Edge Functions → Secrets):

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

---

## Setup

1. **Clone and install**

   ```bash
   cd bibliothek
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` (or create `.env`) and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

3. **Supabase**

   - Create a Supabase project.
   - Run your migrations (tables: `books`, `orders`, `rentals`, `messages`, `reviews`, `push_tokens`, `rental_transactions`, etc. – align with `BookContext` and your schema).
   - Deploy Edge Functions: `create-razorpay-order`, `verify-razorpay-payment`, `verify-razorpay-rental`, and set the Razorpay secrets.

4. **Run**

   ```bash
   npx expo start
   ```

   Then open in Expo Go (scan QR) or run a dev build. For payments and push, use a development build (e.g. `npx eas build --profile development`).

---

## Database schema

Migrations live in `supabase/migrations/`. Run them **in this order** in the Supabase SQL Editor (or use `supabase db push` with the CLI):

| Order | File | What it does |
|-------|------|--------------|
| 1 | `001_books_rls_and_storage.sql` | RLS + storage policies for `books` and `book-images` |
| 2 | `002_books_add_seller_columns.sql` | `seller_name`, `seller_location` on books |
| 3 | `003_books_add_sold_at.sql` | `sold_at` on books |
| 4 | `004_reviews_table.sql` | `reviews` table |
| 5 | `005_orders_table.sql` | `orders` table |
| 6 | `006_books_add_notes.sql` | `notes` on books |
| 7 | `007_orders_return_reason_and_status.sql` | `return_reason`, status values (confirmed, shipped, delivered, return_*) |
| 8 | `008_messages_table.sql` | `messages` table |
| 9 | `009_messages_book_title.sql` | `book_title` on messages |
| 10 | `010_push_tokens.sql` | `push_tokens` table |
| 11 | `011_messages_read_at.sql` | `read_at` on messages |
| 12 | `012_books_listing_type_and_rental.sql` | `listing_type`, rental fields on books |
| 13 | `013_rentals_table.sql` | `rentals` table |
| 14 | `014_rental_violations.sql` | `rental_violations` table |
| 15 | `015_rental_transactions.sql` | `rental_transactions` table |
| 16 | `016_orders_rentals_delivery_address.sql` | Delivery address columns on orders + rentals |
| 17 | `017_orders_rentals_delivery_phone.sql` | `delivery_phone` on orders + rentals |
| 18 | `018_books_extension_major_damage.sql` | Extension + major damage fields on books |

**Note:** You must have the `books` table and `book-images` bucket created first (see `supabase/README_BACKEND.md` Step 0 if needed).

| Table | Purpose |
|-------|---------|
| **books** | Listings: `id`, `title`, `price`, `condition`, `flags`, `notes`, `images`, `seller_id`, `seller_name`, `seller_location`, `created_at`, `sold_at`. For rent: `listing_type`, `rental_days`, `usage_rules`, `damage_penalty`, `late_penalty_per_day`, `security_deposit`, `extension_days`, `extension_fee`, `major_damage_penalty`. RLS: anyone read; insert/update/delete only own (`seller_id = auth.uid()`). |
| **orders** | Purchases: `id`, `buyer_id`, `buyer_name`, `book_id`, `book_title`, `seller_id`, `status` (completed, confirmed, shipped, delivered, return_*), `return_reason`, `created_at`, delivery columns (`delivery_address`, `delivery_city`, `delivery_pincode`, `delivery_phone`, `delivery_lat`, `delivery_lng`). RLS: buyer/seller see own. |
| **reviews** | Per-book reviews: `id`, `book_id`, `user_id`, `user_name`, `rating`, `comment`, `created_at`. RLS: anyone read; insert own; delete own. |
| **messages** | Chat per book: `id`, `book_id`, `book_title`, `from_user_id`, `to_user_id`, `text`, `created_at`, `read_at`. RLS: participants read/insert; both can update (e.g. set `read_at`). |
| **rentals** | Rent agreements: `id`, `book_id`, `book_title`, `seller_id`, `buyer_id`, `buyer_name`, terms (rental_days, usage_rules, damage_penalty, late_penalty_per_day), amounts (rental_fee, security_deposit, extension_fee), dates (start_date, due_date, return_date, extended_due_date), `status` (active, overdue, completed, blocked), payment ids, `pre_rental_images`, `return_images`, `extension_used`, delivery columns. RLS: buyer/seller see and update own. |
| **rental_violations** | Warnings/restrictions: `user_id`, `warning_count`, `restricted_until`, `blocked`. RLS: user reads own; seller of a rental with that buyer can update. |
| **rental_transactions** | Audit: `rental_id`, `type` (rental_payment, deposit_refund, late_fee, damage_fee, extension_fee), `amount_paise`, `razorpay_payment_id`, `notes`, `created_at`. RLS: visible to buyer/seller of the rental. |
| **push_tokens** | Expo push tokens: `user_id`, `token` (unique). RLS: user manages own. |

**Storage:** Bucket `book-images` for listing photos. Policies: anyone read; authenticated upload/delete only under path `{auth.uid()}/...`.

See `supabase/README_BACKEND.md` for step-by-step RLS and storage setup.

---

## Running Edge Functions locally

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) and a local Supabase project (or link to a remote project).

1. **Install CLI:** `npm i -g supabase` (or see official docs).

2. **Link project (optional):** From the repo root, `supabase link --project-ref YOUR_REF` so local commands use your hosted DB and secrets.

3. **Secrets:** Set Razorpay keys for local or remote:
   - Remote: Supabase Dashboard → Project Settings → Edge Functions → Secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
   - Local: `supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...` (when using local functions).

4. **Serve functions:**
   ```bash
   supabase functions serve
   ```
   By default this serves all functions in `supabase/functions/` (e.g. `create-razorpay-order`, `verify-razorpay-payment`, `verify-razorpay-rental`) and reads env from `.env` or Supabase secrets. Use `--env-file .env.local` to pass a local env file.

5. **Invoke from app:** Point the app at your local functions by setting `EXPO_PUBLIC_SUPABASE_URL` to your **hosted** project URL (recommended). Edge Function requests from the app go to the hosted project; for local-only testing you’d use a tunnel (e.g. `ngrok`) and override the functions URL if your client supports it. In practice, deploy functions to the hosted project and set secrets there; use `supabase functions serve` to develop and test new function code before deploying with `supabase functions deploy`.

---

## Delivery (Pincodes)

Delivery is gated by a fixed list of 6-digit Indian pincodes in `src/lib/delivery.ts` (`DELIVERABLE_PINCODES`). Checkout shows “We are not delivering at this location yet” for other pincodes. Replace this with a Supabase table or API when you have a real delivery matrix.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android (native build) |
| `npm run ios` | Run on iOS (native build) |
| `npm run web` | Start for web |
| `npm run lint` | Run Expo lint |

---

## Deployment

- **EAS Build:** Use `eas.json` and `npx eas build --platform android` (or ios). Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS Secrets or in `eas.json` env.
- **App config:** In `app.json`, set a proper `android.package` (e.g. `com.yourname.bibliothek`) for Play Store; `scheme` is already set for linking.
- **Razorpay:** Use live keys and correct Edge Function secrets in production.
- **Push:** Configure FCM (Android) / APNs (iOS) and Expo push credentials for production notifications.

---

## License

Private. All rights reserved.
