/**
 * Production-Ready Supabase PostgreSQL Schema with Multi-Tenant Row Level Security (RLS)
 * Designed specifically for Kiryana (Grocery) Multi-Tenant POS, Inventory & Khata SaaS
 */

export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- KIRYANALFOW - MULTI-TENANT POS & INVENTORY SAAS (SUPABASE POSTGRESQL SCHEMA)
-- Multi-Tenancy Strategy: Shared Database, Isolated by store_id with strict RLS
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE ENUMS & TYPES
-- ==============================================================================
CREATE TYPE store_role AS ENUM ('super_admin', 'store_owner', 'manager', 'cashier');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE khata_tx_type AS ENUM ('debit', 'credit'); -- debit = customer debt increases; credit = payment settled
CREATE TYPE payment_method AS ENUM ('cash', 'online', 'khata', 'split');
CREATE TYPE order_status AS ENUM ('completed', 'cancelled', 'refunded');

-- ==============================================================================
-- 3. TENANT MANAGEMENT & MULTI-TENANCY CORE
-- ==============================================================================

-- Stores / Tenants Table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    currency VARCHAR(10) DEFAULT 'PKR',
    tax_rate NUMERIC(5, 4) DEFAULT 0.0000, -- e.g. 0.0500 for 5%
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    subscription_plan subscription_tier DEFAULT 'pro',
    max_registers INT DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Users & RBAC (Maps Supabase Auth auth.users -> stores)
CREATE TABLE IF NOT EXISTS public.store_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role store_role NOT NULL DEFAULT 'cashier',
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_store_user UNIQUE (store_id, user_id)
);

-- ==============================================================================
-- 4. INVENTORY & PACKAGING / UNIT CONVERSIONS
-- ==============================================================================

-- Categories (Scoped per store)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_store_category UNIQUE (store_id, name)
);

-- Master Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    base_unit VARCHAR(50) NOT NULL DEFAULT 'packet', -- 'kg', 'gram', 'packet', 'pcs', 'liter'
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    retail_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12, 2) DEFAULT 0.00,
    stock_in_base_units NUMERIC(12, 3) NOT NULL DEFAULT 0.000, -- precise decimal stock
    min_stock_alert NUMERIC(12, 3) DEFAULT 5.000,
    has_variants BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_store_barcode UNIQUE (store_id, barcode)
);

-- Product Variants (e.g. 250g, 500g, 1kg or Flavour variations)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    cost_price NUMERIC(12, 2) NOT NULL,
    retail_price NUMERIC(12, 2) NOT NULL,
    wholesale_price NUMERIC(12, 2) DEFAULT 0.00,
    stock_in_base_units NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    base_unit VARCHAR(50) NOT NULL DEFAULT 'packet',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unit Conversions Table (Carton / Box / Bag -> Base Units)
CREATE TABLE IF NOT EXISTS public.unit_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    bulk_unit_name VARCHAR(50) NOT NULL, -- e.g. "Carton", "Bag (Bori)", "Box", "Crate"
    base_unit_name VARCHAR(50) NOT NULL, -- e.g. "Packet", "Piece", "Kg"
    conversion_factor NUMERIC(10, 3) NOT NULL CHECK (conversion_factor > 0), -- e.g. 24 (1 Carton = 24 Packets)
    bulk_discount_percent NUMERIC(5, 2) DEFAULT 0.00, -- e.g. 5% off if bought in bulk
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_store_product_bulk_unit UNIQUE (store_id, product_id, bulk_unit_name)
);

-- ==============================================================================
-- 5. CUSTOMER KHATA (UDHAAR / LEDGER) SYSTEM
-- ==============================================================================

-- Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 10000.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00, -- Positive: Customer owes store; Negative: Advance paid
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_store_customer_phone UNIQUE (store_id, phone)
);

-- Khata Ledger Transactions (Double-entry credit tracking)
CREATE TABLE IF NOT EXISTS public.khata_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    order_id UUID, -- Optional foreign key if transaction originated from a POS order
    type khata_tx_type NOT NULL, -- 'debit' = sale on credit (+debt), 'credit' = customer cash/online payment (-debt)
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'cash',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. POS BILLING & ORDERS
-- ==============================================================================

-- Orders Table (Header)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name VARCHAR(255),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    cash_paid NUMERIC(12, 2) DEFAULT 0.00,
    change_due NUMERIC(12, 2) DEFAULT 0.00,
    khata_amount NUMERIC(12, 2) DEFAULT 0.00,
    status order_status DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_store_order_number UNIQUE (store_id, order_number)
);

-- Order Items (Line Items with Unit Details)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    product_name VARCHAR(255) NOT NULL,
    selected_unit VARCHAR(50) NOT NULL, -- e.g. "Carton" or "Packet" or "kg"
    conversion_factor NUMERIC(10, 3) NOT NULL DEFAULT 1.000, -- factor to base unit
    quantity NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    base_cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_store_users_lookup ON public.store_users (user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_barcode ON public.products (store_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON public.products (store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_phone ON public.customers (store_id, phone);
CREATE INDEX IF NOT EXISTS idx_orders_store_date ON public.orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_khata_customer_history ON public.khata_transactions (customer_id, created_at DESC);

-- ==============================================================================
-- 8. SECURITY HELPER FUNCTIONS FOR SUPABASE RLS
-- ==============================================================================

-- Check if current authenticated user is a Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.store_users
        WHERE user_id = auth.uid()
          AND role = 'super_admin'
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current authenticated user belongs to the specified store
CREATE OR REPLACE FUNCTION public.user_has_store_access(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins have access to all stores
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Standard store members access only their assigned store
    RETURN EXISTS (
        SELECT 1 FROM public.store_users
        WHERE user_id = auth.uid()
          AND store_id = target_store_id
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is at least a Store Owner or Manager in the store
CREATE OR REPLACE FUNCTION public.user_is_store_manager_or_higher(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.store_users
        WHERE user_id = auth.uid()
          AND store_id = target_store_id
          AND role IN ('store_owner', 'manager')
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tenant tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- STORES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Super Admins can do everything on stores"
ON public.stores FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Store users can view their own store"
ON public.stores FOR SELECT
TO authenticated
USING (public.user_has_store_access(id));

CREATE POLICY "Store owners can update their own store profile"
ON public.stores FOR UPDATE
TO authenticated
USING (public.user_is_store_manager_or_higher(id))
WITH CHECK (public.user_is_store_manager_or_higher(id));

-- ------------------------------------------------------------------------------
-- STORE USERS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view members in their store"
ON public.store_users FOR SELECT
TO authenticated
USING (public.user_has_store_access(store_id));

CREATE POLICY "Store owners and super admins can manage store users"
ON public.store_users FOR ALL
TO authenticated
USING (public.user_is_store_manager_or_higher(store_id))
WITH CHECK (public.user_is_store_manager_or_higher(store_id));

-- ------------------------------------------------------------------------------
-- PRODUCTS & INVENTORY POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Store members can view products"
ON public.products FOR SELECT
TO authenticated
USING (public.user_has_store_access(store_id));

CREATE POLICY "Store managers and owners can insert/update products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.user_is_store_manager_or_higher(store_id));

CREATE POLICY "Store managers and owners can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.user_is_store_manager_or_higher(store_id))
WITH CHECK (public.user_is_store_manager_or_higher(store_id));

CREATE POLICY "Store owners can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.user_is_store_manager_or_higher(store_id));

-- (Same robust pattern applied to categories, variants, and unit conversions)
CREATE POLICY "Store members view categories" ON public.categories FOR SELECT TO authenticated USING (public.user_has_store_access(store_id));
CREATE POLICY "Store managers edit categories" ON public.categories FOR ALL TO authenticated USING (public.user_is_store_manager_or_higher(store_id));

CREATE POLICY "Store members view variants" ON public.product_variants FOR SELECT TO authenticated USING (public.user_has_store_access(store_id));
CREATE POLICY "Store managers edit variants" ON public.product_variants FOR ALL TO authenticated USING (public.user_is_store_manager_or_higher(store_id));

CREATE POLICY "Store members view unit conversions" ON public.unit_conversions FOR SELECT TO authenticated USING (public.user_has_store_access(store_id));
CREATE POLICY "Store managers edit unit conversions" ON public.unit_conversions FOR ALL TO authenticated USING (public.user_is_store_manager_or_higher(store_id));

-- ------------------------------------------------------------------------------
-- CUSTOMERS & KHATA (LEDGER) POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Store members view customers"
ON public.customers FOR SELECT
TO authenticated
USING (public.user_has_store_access(store_id));

CREATE POLICY "Cashiers and above can create or update customers"
ON public.customers FOR ALL
TO authenticated
USING (public.user_has_store_access(store_id))
WITH CHECK (public.user_has_store_access(store_id));

CREATE POLICY "Store members view khata transactions"
ON public.khata_transactions FOR SELECT
TO authenticated
USING (public.user_has_store_access(store_id));

CREATE POLICY "Cashiers and managers can record khata transactions"
ON public.khata_transactions FOR INSERT
TO authenticated
WITH CHECK (public.user_has_store_access(store_id));

-- ------------------------------------------------------------------------------
-- ORDERS & BILLING POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Store members can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.user_has_store_access(store_id));

CREATE POLICY "Store cashiers can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (public.user_has_store_access(store_id));

CREATE POLICY "Store managers can update/void orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.user_is_store_manager_or_higher(store_id));

CREATE POLICY "Store members can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (public.user_has_store_access(store_id));

CREATE POLICY "Cashiers can insert order items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (public.user_has_store_access(store_id));

-- ==============================================================================
-- 10. ATOMIC TRIGGERS: KHATA BALANCE & INVENTORY DEDUCTION
-- ==============================================================================

-- Trigger to automatically update customer current_balance when a khata transaction occurs
CREATE OR REPLACE FUNCTION public.trg_update_customer_khata_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'debit' THEN
        -- Customer bought goods on credit -> debt increases
        UPDATE public.customers
        SET current_balance = current_balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.customer_id;
    ELSIF NEW.type = 'credit' THEN
        -- Customer paid cash/online -> debt decreases
        UPDATE public.customers
        SET current_balance = current_balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_after_khata_insert
AFTER INSERT ON public.khata_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trg_update_customer_khata_balance();

-- Trigger to atomically decrement stock in base units when order items are sold
CREATE OR REPLACE FUNCTION public.trg_deduct_inventory_stock()
RETURNS TRIGGER AS $$
DECLARE
    deduction_amount NUMERIC(12, 3);
BEGIN
    -- Multiply sold quantity by packaging conversion factor to get base units
    deduction_amount := NEW.quantity * NEW.conversion_factor;

    IF NEW.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock_in_base_units = stock_in_base_units - deduction_amount
        WHERE id = NEW.variant_id;
    ELSE
        UPDATE public.products
        SET stock_in_base_units = stock_in_base_units - deduction_amount,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_after_order_item_sold
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_deduct_inventory_stock();
`;
