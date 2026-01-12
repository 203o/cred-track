# Cred Track

A Next.js application for credit tracking, allowing shops to text people who have picked items from their shop.

## Project Structure

This project uses:
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Better Auth** for authentication

### Key Files Explained:

1. **`package.json`** - Defines project dependencies and scripts
   - `npm run dev` - Start development server
   - `npm run build` - Build for production
   - `npm start` - Start production server

2. **`tsconfig.json`** - TypeScript configuration
   - Enables strict type checking
   - Sets up path aliases (`@/*` points to root)

3. **`tailwind.config.ts`** - Tailwind CSS configuration
   - Configures which files Tailwind should scan for classes
   - Defines custom theme colors

4. **`postcss.config.mjs`** - PostCSS configuration
   - Processes Tailwind CSS and adds vendor prefixes

5. **`app/`** - App Router directory (Next.js 13+)
   - `layout.tsx` - Root layout component (wraps all pages)
   - `page.tsx` - Login page (root page)
   - `signup/page.tsx` - Sign up page
   - `dashboard/page.tsx` - Protected dashboard page
   - `globals.css` - Global styles with Tailwind directives

6. **`lib/auth.ts`** - Better Auth server configuration
7. **`lib/auth-client.ts`** - Better Auth client utilities
8. **`app/api/auth/[...all]/route.ts`** - Better Auth API route handler

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file in the root directory with:
   ```env
   BETTER_AUTH_SECRET=your_secret_key_here_min_32_characters
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Authentication

The app includes:
- **Login page** (root page `/`) with email/password and Google sign-in
- **Sign up page** (`/signup`) with email/password and Google sign-up
- **Protected dashboard** (`/dashboard`) - requires authentication

## Next Steps

We'll build the credit tracking system step by step, allowing shops to:
- Track items picked by customers
- Send text messages to customers
- Manage credit records
