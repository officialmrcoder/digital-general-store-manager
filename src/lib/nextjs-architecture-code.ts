/**
 * Complete Next.js (App Router) + Supabase + PWA Architecture Blueprint
 * Shows the exact directory hierarchy, configuration files, middleware, and route handlers.
 */

export const NEXTJS_FOLDER_TREE = `kiryana-pos-saas/
├── .env.local                          # Supabase URL, anon key, service role key
├── next.config.mjs                     # Next.js config + Serwist PWA wrapper
├── package.json                        # Dependencies (Next 15, Serwist, Supabase SSR, Lucide)
├── tsconfig.json
├── tailwind.config.ts
├── middleware.ts                       # Multi-tenant routing & Supabase session validation
│
├── app/
│   ├── layout.tsx                      # Root HTML, PWA viewport, font & theme providers
│   ├── manifest.ts                     # Native Next.js Web App Manifest (App Router)
│   ├── sw.ts                           # Serwist Service Worker (offline caching & background sync)
│   ├── (auth)/                         # Authentication route group
│   │   ├── login/page.tsx              # Cashier & Owner login screen
│   │   └── reset-password/page.tsx
│   │
│   ├── (super-admin)/                  # SaaS Super Admin Dashboard
│   │   ├── admin/
│   │   │   ├── stores/page.tsx         # Tenant provisioning (Create new Kiryana store)
│   │   │   ├── subscriptions/page.tsx  # Billing & subscription tiers
│   │   │   └── layout.tsx
│   │
│   └── (store)/[storeSlug]/            # Multi-Tenant Store Scoped Routes
│       ├── layout.tsx                  # Store context provider, offline status banner, navbar
│       ├── pos/                        # Fast touch-friendly billing terminal
│       │   └── page.tsx
│       ├── inventory/                  # Products, variants & unit conversion management
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── conversions/page.tsx
│       ├── khata/                      # Customer ledger (Udhaar) system
│       │   ├── page.tsx
│       │   └── [customerId]/page.tsx   # Detailed ledger transactions & WhatsApp reminder
│       ├── orders/                     # Sales history & thermal receipt reprint
│       │   ├── page.tsx
│       │   └── [orderId]/page.tsx
│       ├── settings/                   # Store details, tax rate, receipt header/footer
│       │   └── page.tsx
│       └── page.tsx                    # Store Executive Dashboard (KPIs, profit, sales)
│
├── components/
│   ├── common/
│   │   ├── PWAInstallButton.tsx        # In-app install button (Chromium & iOS guide)
│   │   ├── OfflineBadge.tsx            # Network status indicator
│   │   └── Modal.tsx
│   ├── pos/
│   │   ├── POSBillingScreen.tsx        # Fast billing interface
│   │   ├── ProductGrid.tsx             # Touch-friendly item grid
│   │   ├── BarcodeScanner.tsx          # Camera / USB Barcode listener
│   │   ├── CartDrawer.tsx              # Mobile bottom sheet & desktop ticket sidebar
│   │   ├── UnitSelectorModal.tsx       # Sell by carton vs packet vs fractional kg
│   │   ├── PaymentModal.tsx            # Cash / Card / Khata credit checkout
│   │   └── ThermalReceipt.tsx          # 58mm / 80mm printable thermal slip
│   ├── inventory/
│   │   ├── ProductForm.tsx
│   │   ├── UnitConversionEditor.tsx    # Conversion ratio setup (e.g. 1 Carton = 24 Packs)
│   │   └── StockAdjustDialog.tsx
│   └── khata/
│       ├── CustomerCard.tsx            # Balance badge (Receivable / Advance)
│       ├── AddTransactionModal.tsx     # Debit (Goods on credit) / Credit (Cash paid)
│       └── ReminderTemplateModal.tsx   # Auto-formatted SMS / WhatsApp text
│
├── lib/
│   ├── calculations.ts                 # POS calculations, precision math, unit conversions
│   ├── units.ts                        # Standard grocery units catalog (kg, g, pao, maund)
│   ├── supabase/
│   │   ├── client.ts                   # createBrowserClient (Client Components)
│   │   ├── server.ts                   # createServerClient (Server Actions & Server Components)
│   │   └── middleware.ts               # Session refresh & cookie synchronization
│   └── hooks/
│       ├── usePWAInstall.ts            # PWA installation prompt hook
│       ├── useBarcodeListener.ts       # USB barcode gun keyboard wedge listener
│       └── useOnlineStatus.ts          # Offline status tracking
│
└── public/
    ├── icon.svg
    ├── pwa-192x192.png
    ├── pwa-512x512.png
    └── apple-touch-icon.png
`;

export const NEXT_CONFIG_CODE = `// next.config.mjs
// IMPORTANT: Use @serwist/next instead of legacy 'next-pwa' (unmaintained and broken in Next 14/15)
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default withSerwist(nextConfig);
`;

export const MIDDLEWARE_CODE = `// middleware.ts
// Handles Multi-Tenant routing and Supabase Auth session validation
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Public paths
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/api/public')) {
    return response;
  }

  // Protect store & admin routes
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
`;

export const MANIFEST_CODE = `// app/manifest.ts
// Native Next.js 14/15 App Router Web App Manifest
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'KiryanaFlow - Grocery POS & Khata SaaS',
    short_name: 'KiryanaFlow',
    description: 'Multi-Tenant Kiryana POS, Smart Inventory & Khata Ledger',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#059669',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
`;
