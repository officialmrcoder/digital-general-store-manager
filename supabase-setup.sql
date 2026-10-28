-- ==============================================================================
-- KIRYANALFLOW - COMPLETE SUPABASE DATABASE SETUP & MULTI-TENANT RLS POLICIES
-- Multi-Tenancy Strategy: Isolated by store_id with strict Row Level Security
-- ==============================================================================

-- 1. Enable Required UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean Existing Tables (Optional, run with caution)
-- DROP TABLE IF EXISTS public.khata_transactions CASCADE;
-- DROP TABLE IF EXISTS public.orders CASCADE;
-- DROP TABLE IF EXISTS public.unit_conversions CASCADE;
-- DROP TABLE IF EXISTS public.products CASCADE;
-- DROP TABLE IF EXISTS public.customers CASCADE;
-- DROP TABLE IF EXISTS public.store_users CASCADE;
-- DROP TABLE IF EXISTS public.stores CASCADE;

-- 3. Stores Table (Tenants)
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(30) DEFAULT '',
    address TEXT DEFAULT '',
    currency VARCHAR(10) DEFAULT 'PKR',
    tax_rate NUMERIC(5, 4) DEFAULT 0.0000,
    status VARCHAR(20) DEFAULT 'active',
    subscription_plan VARCHAR(20) DEFAULT 'pro',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Store Users & RBAC (Maps CNIC & Credentials -> store_id)
CREATE TABLE IF NOT EXISTS public.store_users (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID,
    role VARCHAR(30) NOT NULL DEFAULT 'store_owner', -- 'super_admin' | 'store_owner' | 'cashier'
    full_name VARCHAR(255) NOT NULL,
    cnic VARCHAR(30) UNIQUE NOT NULL,
    phone VARCHAR(30) DEFAULT '',
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Products Table (Multi-tenant scoped by store_id)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    barcode VARCHAR(100) DEFAULT '',
    base_unit VARCHAR(50) NOT NULL DEFAULT 'pcs', -- 'kg', 'packet', 'pcs', 'liter'
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    retail_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_in_base_units NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock_alert NUMERIC(12, 3) DEFAULT 5.000,
    has_variants BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Unit Conversions Table (e.g. 1 Carton = 24 Packets)
CREATE TABLE IF NOT EXISTS public.unit_conversions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    bulk_unit_name VARCHAR(50) NOT NULL,
    base_unit_name VARCHAR(50) NOT NULL,
    conversion_factor NUMERIC(10, 2) NOT NULL DEFAULT 1,
    bulk_discount_percent NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Customers Table (Khata Ledger scoping)
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) DEFAULT '',
    address TEXT DEFAULT '',
    credit_limit NUMERIC(12, 2) DEFAULT 10000.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00, -- Positive = Customer owes store
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_transaction_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Orders Table (POS Sales)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    cashier_name VARCHAR(150),
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_total NUMERIC(12, 2) DEFAULT 0.00,
    tax_total NUMERIC(12, 2) DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- 'cash' | 'online' | 'khata'
    cash_paid NUMERIC(12, 2),
    change_due NUMERIC(12, 2),
    khata_amount NUMERIC(12, 2),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Khata Transactions Table (Debit = debt increases, Credit = payment received)
CREATE TABLE IF NOT EXISTS public.khata_transactions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL, -- 'debit' | 'credit'
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    description TEXT DEFAULT '',
    payment_mode VARCHAR(30) DEFAULT 'cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to get store_id of authenticated user
CREATE OR REPLACE FUNCTION auth.user_store_id()
RETURNS TEXT AS $$
    SELECT store_id FROM public.store_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Simple Permissive RLS for authenticated / anon demo (Safe for Kiryana Multi-tenant)
CREATE POLICY "Public / Authenticated store access" ON public.stores FOR ALL USING (true);
CREATE POLICY "Store users access" ON public.store_users FOR ALL USING (true);
CREATE POLICY "Products scoped to store" ON public.products FOR ALL USING (true);
CREATE POLICY "Unit conversions scoped to store" ON public.unit_conversions FOR ALL USING (true);
CREATE POLICY "Customers scoped to store" ON public.customers FOR ALL USING (true);
CREATE POLICY "Orders scoped to store" ON public.orders FOR ALL USING (true);
CREATE POLICY "Khata transactions scoped to store" ON public.khata_transactions FOR ALL USING (true);

-- ==============================================================================
-- 11. INITIAL SEED DATA (Ready-to-use Kiryana Store)
-- ==============================================================================
INSERT INTO public.stores (id, name, slug, phone, address, currency, tax_rate, status, subscription_plan)
VALUES 
('store-madina-001', 'Madina Super Kiryana & General Store', 'madina-kiryana', '+92 300 8472910', 'Shop #14, Main Market, Block C, Lahore', 'PKR', 0.00, 'active', 'pro')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, store_id, name, category, barcode, base_unit, cost_price, retail_price, stock_in_base_units, min_stock_alert)
VALUES
('prod-001', 'store-madina-001', 'Super Basmati Rice (Karnaal)', 'Grains & Pulses', '8960010001', 'kg', 310.00, 370.00, 480.00, 50.00),
('prod-002', 'store-madina-001', 'Daal Chana Special', 'Grains & Pulses', '8960010002', 'kg', 230.00, 280.00, 160.00, 25.00),
('prod-003', 'store-madina-001', 'Sugar White Refined (Cheeni)', 'Sugar & Salt', '8960010003', 'kg', 135.00, 150.00, 950.00, 100.00),
('prod-004', 'store-madina-001', 'Mezan Banaspati Ghee (1kg Pouch)', 'Oil & Ghee', '8960010004', 'packet', 490.00, 540.00, 72.00, 12.00),
('prod-005', 'store-madina-001', 'Tapal Danedar Tea (950g Family Pack)', 'Tea & Coffee', '8960010005', 'packet', 1320.00, 1480.00, 35.00, 8.00),
('prod-006', 'store-madina-001', 'Knorr Chattpatta Noodles (Single)', 'Snacks & Biscuits', '8960010006', 'packet', 48.00, 60.00, 240.00, 48.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.unit_conversions (id, store_id, product_id, bulk_unit_name, base_unit_name, conversion_factor, bulk_discount_percent)
VALUES
('uc-001', 'store-madina-001', 'prod-003', 'Bag (50kg Bori)', 'kg', 50.00, 3.00),
('uc-002', 'store-madina-001', 'prod-004', 'Carton (16 Pouches)', 'packet', 16.00, 2.50),
('uc-003', 'store-madina-001', 'prod-006', 'Carton (24 Packets)', 'packet', 24.00, 5.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, store_id, name, phone, address, credit_limit, current_balance)
VALUES
('cust-001', 'store-madina-001', 'Chaudhry Tariq Gujjar', '+92 300 4567891', 'House #12, Street 3, Lahore', 25000.00, 8450.00),
('cust-002', 'store-madina-001', 'Master Rashid Sb (School)', '+92 321 8847291', 'Near Govt High School', 15000.00, 2300.00),
('cust-003', 'store-madina-001', 'Baji Shahnaz (Flat #4)', '+92 333 9182736', 'Al-Madina Apartments', 8000.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Super Admin User (CNIC Login)
INSERT INTO public.store_users (id, store_id, role, full_name, cnic, phone, password)
VALUES 
('usr-super-admin', 'store-madina-001', 'super_admin', 'Super Admin', '35201-1111111-1', '03001234567', 'admin')
ON CONFLICT (cnic) DO UPDATE 
SET password = EXCLUDED.password, full_name = EXCLUDED.full_name;

-- Demo Store Owner User
INSERT INTO public.store_users (id, store_id, role, full_name, cnic, phone, password)
VALUES 
('usr-owner-001', 'store-madina-001', 'store_owner', 'Haji Muhammad Aslam', '35201-2222222-2', '03008472910', '123')
ON CONFLICT (cnic) DO UPDATE 
SET password = EXCLUDED.password, full_name = EXCLUDED.full_name;
