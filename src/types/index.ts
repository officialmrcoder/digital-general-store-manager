export type StoreRole = 'super_admin' | 'store_owner' | 'manager' | 'cashier';

export interface Store {
  id: string; // UUID (store_id in Supabase)
  name: string;
  slug: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  status: 'active' | 'suspended';
  subscriptionPlan?: 'free' | 'pro' | 'enterprise';
  ownerName?: string;
  ownerCnic?: string;
  createdAt: string;
}

export interface StoreUser {
  id: string;
  storeId: string;
  userId: string;
  fullName: string;
  cnic: string;
  phone?: string;
  password?: string;
  role: StoreRole;
}

export type UnitCategory = 'weight' | 'count' | 'volume';

/** Store-defined product category (inventory grouping). */
export interface ProductCategory {
  id: string;
  storeId: string;
  name: string;
  /** Typical measurement type for items in this category. */
  unitType: UnitCategory;
  createdAt: string;
}

export interface UnitConversion {
  id: string;
  storeId: string;
  productId: string;
  bulkUnitName: string; // e.g. "Carton", "Box", "Bag (Bori)", "Crate"
  baseUnitName: string; // e.g. "Packet", "Piece", "Kg", "Bottle"
  conversionFactor: number; // e.g. 24 (1 Carton = 24 Packets)
  bulkPriceDiscountPercent?: number; // e.g. 5% cheaper if buying full carton
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g. "1kg Pack", "5kg Bag", "250g Jar"
  sku: string;
  barcode: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice?: number;
  stockInBaseUnits: number; // Current stock in base units
  baseUnit: string; // "pcs", "kg", "g", "packet", "liter", "ml"
  bulkUnit?: string; // "Carton", "Box", "Bag"
  conversionRatio?: number; // e.g. 24 base units per bulk unit
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  category: string;
  imageUrl?: string;
  barcode: string;
  baseUnit: string; // Default base unit: "packet", "kg", "pcs", "liter"
  costPrice: number;
  retailPrice: number;
  stockInBaseUnits: number;
  minStockAlert: number;
  hasVariants: boolean;
  variants?: ProductVariant[];
  unitConversions?: UnitConversion[];
  createdAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  address?: string;
  creditLimit: number; // Maximum allowed Khata (Udhaar) debt
  currentBalance: number; // Positive = Customer owes store (You'll receive); Negative = Store owes customer (Advance)
  createdAt: string;
  lastTransactionAt?: string;
}

export type KhataTransactionType = 'debit' | 'credit'; // debit = goods given on credit (increases receivable), credit = payment received (decreases receivable)

export interface KhataTransaction {
  id: string;
  storeId: string;
  customerId: string;
  orderId?: string;
  type: KhataTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  paymentMode?: 'cash' | 'online' | 'bank_transfer' | 'cheque';
  createdAt: string;
  createdBy: string;
}

export interface CartItem {
  cartItemId: string; // unique for this cart line
  productId: string;
  variantId?: string;
  name: string;
  selectedUnit: string; // either baseUnit (e.g. "Packet", "g", "kg") or bulkUnit (e.g. "Carton", "Bag")
  isBulkUnit: boolean;
  conversionFactor: number; // how many base units in 1 of this selected unit
  quantity: number; // number of selected units (e.g. 0.5 for half kg, or 2 for 2 cartons)
  unitPrice: number; // price per selected unit
  baseCostPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number; // (unitPrice * quantity) - discountAmount + taxAmount
}

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'online' | 'khata' | 'split';
  cashPaid?: number;
  changeDue?: number;
  khataAmount?: number;
  notes?: string;
  status: 'completed' | 'cancelled' | 'refunded';
  createdAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayOrdersCount: number;
  todayProfit: number;
  totalKhataReceivables: number;
  lowStockItemsCount: number;
  cashSales: number;
  onlineSales: number;
  khataSales: number;
}
