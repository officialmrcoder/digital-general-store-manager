# Digital General Store Manager 🛒⚡

A modern, high-performance **Multi-Tenant Cloud Point of Sale (POS), Inventory Control, and Customer Khata (Udhaar) Management SaaS** built for grocery stores, retail marts, and general stores.

Designed with an ultra-clean, minimalist **White & Black** interface that is fast, touch-friendly, and easy to use for non-technical store owners and cashiers.

---

## 🌟 Key Features

- **🛡️ Super Admin Control Panel**:
  - Multi-tenant architecture isolated by `store_id`.
  - Create new stores with dedicated Owner CNIC & Password credentials.
  - Instantly activate, suspend, or delete stores.
  - Multi-store overview with phone contact and registration status.

- **💻 Touch-Friendly POS Billing Screen**:
  - Ultra-clean product grid with instant search and category filtering.
  - One-tap cart additions, quantity adjustments, and fast checkout modal.
  - Split payment options (Cash, Online / Bank Transfer, Udhaar / Khata).
  - Thermal receipt printing and PDF receipt generation.

- **📦 Inventory Management**:
  - Full CRUD operations (Add, Edit, Update Stock, Delete products).
  - Low stock warning badges.
  - Fractional quantity and multi-unit conversions (e.g. 1 Bori / Box = 12 Packets).

- **📒 Digital Khata (Customer Udhaar Ledger)**:
  - Real-time customer balance tracking (Receivables & Payments).
  - Customer profile creation with phone numbers and credit limits.
  - Detailed audit ledger for every transaction.
  - WhatsApp payment reminder links.

- **🔒 CNIC-Based Secure Authentication**:
  - Login using Pakistani CNIC (13 digits) as the unique username.
  - Password visibility toggle (Show / Hide eye icon).
  - Role-based redirection (Super Admin goes to Global Admin; Store Owner goes directly to their Store).

- **☁️ Supabase Cloud & Offline Support**:
  - Real-time database sync with Supabase PostgreSQL and Row Level Security (RLS).
  - Offline-first resilience with LocalStorage persistence so sales never stop during internet downtime.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Minimalist White & Black Light Theme)
- **Icons**: Lucide React
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security)
- **Deployment**: Vercel (Configured with SPA routing)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/digital-general-store-manager.git
   cd digital-general-store-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## ☁️ Deploy to Vercel

1. Push your code to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your `digital-general-store-manager` GitHub repository.
4. Add your Environment Variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
5. Click **Deploy**. Vercel will build and deploy your project automatically with zero configuration.

---

## 📄 License
MIT License. Built by AlEnded Solutions.

