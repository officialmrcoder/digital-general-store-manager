import React, { useState, useMemo } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  User,
  ShoppingBag,
  CreditCard,
  DollarSign,
  BookOpen,
  CheckCircle,
  Package,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Store, Product, Customer, CartItem, Order } from '../../types';
import { calculateOrderTotals, calculateCashChange, roundToDecimals } from '../../lib/calculations';
import { UnitSelectionModal } from './UnitSelectionModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface POSBillingScreenProps {
  store: Store;
  products: Product[];
  customers: Customer[];
  cashierName: string;
  onProcessOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'storeId' | 'createdAt'>) => Order;
}

export const POSBillingScreen: React.FC<POSBillingScreenProps> = ({
  store,
  products,
  customers,
  cashierName,
  onProcessOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  
  // Checkout & Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'khata'>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);

  // Completed Order & Receipt
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Selected customer object
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculate Cart Totals
  const totals = useMemo(() => {
    return calculateOrderTotals(cartItems, orderDiscount, store.taxRate);
  }, [cartItems, orderDiscount, store.taxRate]);

  // Barcode quick scan listener
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check direct barcode match
    const foundProduct = products.find(
      (p) => p.barcode === searchQuery.trim() || p.id === searchQuery.trim()
    );

    if (foundProduct) {
      handleProductCardClick(foundProduct);
      setSearchQuery('');
    }
  };

  // Add product to cart: if has conversions or weight, open unit modal
  const handleProductCardClick = (product: Product) => {
    if (
      (product.unitConversions && product.unitConversions.length > 0) ||
      product.baseUnit === 'kg' ||
      product.baseUnit === 'gram'
    ) {
      setModalProduct(product);
    } else {
      // Standard piece / packet item with single unit
      const existingIndex = cartItems.findIndex(
        (ci) => ci.productId === product.id && ci.selectedUnit === product.baseUnit
      );

      if (existingIndex >= 0) {
        const updated = [...cartItems];
        updated[existingIndex].quantity += 1;
        updated[existingIndex].totalAmount = roundToDecimals(
          updated[existingIndex].quantity * updated[existingIndex].unitPrice,
          2
        );
        setCartItems(updated);
      } else {
        const newItem: CartItem = {
          cartItemId: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          selectedUnit: product.baseUnit,
          isBulkUnit: false,
          conversionFactor: 1,
          quantity: 1,
          unitPrice: product.retailPrice,
          baseCostPrice: product.costPrice,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: product.retailPrice,
        };
        setCartItems((prev) => [...prev, newItem]);
      }
    }
  };

  const handleAddToCartFromModal = (newItem: CartItem) => {
    setCartItems((prev) => {
      // If exact same item with same unit already exists, sum quantity
      const existing = prev.findIndex(
        (ci) => ci.productId === newItem.productId && ci.selectedUnit === newItem.selectedUnit
      );
      if (existing >= 0) {
        const clone = [...prev];
        clone[existing].quantity = roundToDecimals(clone[existing].quantity + newItem.quantity, 2);
        clone[existing].totalAmount = roundToDecimals(
          clone[existing].quantity * clone[existing].unitPrice - clone[existing].discountAmount,
          2
        );
        return clone;
      }
      return [...prev, newItem];
    });
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = roundToDecimals(item.quantity + delta, 2);
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalAmount: roundToDecimals(newQty * item.unitPrice - item.discountAmount, 2),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomerId('');
    setOrderDiscount(0);
    setCashTendered(0);
  };

  // Open Checkout Modal
  const initiateCheckout = (method: 'cash' | 'online' | 'khata') => {
    if (cartItems.length === 0) return;

    if (method === 'khata' && !selectedCustomerId) {
      alert('Please select a Khata customer first to add this bill on credit (Udhaar).');
      return;
    }

    setPaymentMethod(method);
    setCashTendered(totals.grandTotal);
    setShowPaymentModal(true);
  };

  // Confirm payment & process order
  const handleFinalizeSale = () => {
    let cashPaid = 0;
    let changeDue = 0;
    let khataAmount = 0;

    if (paymentMethod === 'cash') {
      cashPaid = cashTendered;
      const changeCalc = calculateCashChange(totals.grandTotal, cashTendered);
      changeDue = changeCalc.changeDue;
    } else if (paymentMethod === 'khata') {
      khataAmount = totals.grandTotal;
    }

    const orderResult = onProcessOrder({
      cashierId: 'cashier-001',
      cashierName,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer ? selectedCustomer.name : undefined,
      items: cartItems,
      subtotal: totals.subtotal,
      discountTotal: totals.totalDiscount,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      paymentMethod,
      cashPaid: paymentMethod === 'cash' ? cashPaid : undefined,
      changeDue: paymentMethod === 'cash' ? changeDue : undefined,
      khataAmount: paymentMethod === 'khata' ? khataAmount : undefined,
      status: 'completed',
    });

    setShowPaymentModal(false);
    setCompletedOrder(orderResult);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50 text-slate-900 antialiased">
      {/* LEFT / CENTER: Products Catalog & Search */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
        {/* Search Bar & Barcode Scanner Form */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center gap-2">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by name, barcode, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Barcode scanner test button */}
          <button
            type="button"
            onClick={() => {
              if (products.length > 0) {
                const randomProd = products[Math.floor(Math.random() * products.length)];
                handleProductCardClick(randomProd);
              }
            }}
            title="Simulate Barcode Gun Beep"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold border border-slate-300 transition shrink-0 cursor-pointer"
          >
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Product Grid ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28 sm:pb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 content-start">
          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 text-center">
              <Package className="w-10 h-10 mb-3 opacity-40 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No items found</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search or add items from Inventory</p>
            </div>
          )}
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stockInBaseUnits <= 0;
            const isLowStock = !isOutOfStock && product.stockInBaseUnits <= product.minStockAlert;

            return (
              <button
                key={product.id}
                onClick={() => handleProductCardClick(product)}
                disabled={isOutOfStock}
                className={`relative flex flex-col justify-between p-3 rounded-2xl border text-left transition active:scale-95 ${
                  isOutOfStock
                    ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:border-black shadow-xs hover:shadow-sm cursor-pointer'
                }`}
                style={{ minHeight: '96px' }}
              >
                {/* Stock indicator dots */}
                {isOutOfStock && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 shadow-xs" />
                )}
                {isLowStock && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                )}

                {/* Product Name */}
                <p className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug pr-3 flex-1">
                  {product.name}
                </p>

                {/* Price + Add Button */}
                <div className="flex items-center justify-between mt-2 gap-1">
                  <p className="font-black text-sm text-black leading-none">
                    {store.currency}&nbsp;{product.retailPrice.toLocaleString()}
                  </p>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition shadow-xs ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-black hover:bg-slate-800 text-white'
                  }`}>
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mobile Floating Cart Bar (shown when cart has items and not expanded) ── */}
      {cartItems.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-[60px] inset-x-3 z-30">
          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-black text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between active:scale-98 transition-transform cursor-pointer border border-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <span className="font-bold text-xs">View Bill / Checkout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm">
                {store.currency} {totals.grandTotal.toLocaleString()}
              </span>
              <ChevronUp className="w-4 h-4 text-slate-300" />
            </div>
          </button>
        </div>
      )}

      {/* ── Mobile Cart Sheet Backdrop ── */}
      {showMobileCart && (
        <div
          onClick={() => setShowMobileCart(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* RIGHT: Live Bill Ticket / Cart Panel */}
      <div
        className={`bg-white flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 transition-all duration-300 ${
          showMobileCart
            ? 'fixed inset-x-0 bottom-0 z-50 h-[88vh] rounded-t-3xl shadow-2xl'
            : 'hidden lg:flex lg:static lg:w-96 xl:w-[420px] lg:h-full'
        }`}
      >
        {/* Mobile Sheet Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-slate-50 border-b border-slate-200 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-black" />
            <span className="font-bold text-sm text-slate-900">
              Current Bill ({cartItems.length} items)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-black text-base text-black font-mono">
              {store.currency} {totals.grandTotal.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setShowMobileCart(false)}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop Panel Header */}
        <div className="hidden lg:flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-black" />
            <h3 className="font-bold text-sm text-slate-900">Active Sale Register</h3>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-700 font-bold transition cursor-pointer"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer Selector for Khata */}
        <div className="p-3 bg-slate-50/60 border-b border-slate-200">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            Customer Khata / Ledger (Optional)
          </label>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-black"
            >
              <option value="">Walk-in Customer (Cash / Direct)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Khata Debt: {store.currency} {c.currentBalance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="mt-2 bg-white rounded-lg p-2 text-xs flex justify-between items-center border border-slate-200 shadow-xs">
              <div>
                <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{selectedCustomer.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Current Balance:</span>
                <p className="font-bold text-red-600 font-mono">
                  {store.currency} {selectedCustomer.currentBalance.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Cart is empty</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Tap any product on the left to add to bill.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.cartItemId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex-1 pr-2">
                  <p className="font-bold text-slate-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-mono">
                      {item.selectedUnit}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      @ {store.currency} {item.unitPrice}
                    </span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId, -1)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-slate-900 text-xs font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId, 1)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-20 text-right font-black text-black pl-2 font-mono">
                  {store.currency} {item.totalAmount.toLocaleString()}
                </div>

                <button
                  onClick={() => removeCartItem(item.cartItemId)}
                  className="p-1 text-slate-400 hover:text-red-600 transition ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Order Summary & Payment Triggers */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({totals.itemCount} items)</span>
                <span className="font-mono font-bold text-slate-900">
                  {store.currency} {totals.subtotal.toLocaleString()}
                </span>
              </div>
              {store.taxRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({(store.taxRate * 100).toFixed(1)}%)</span>
                  <span className="font-mono text-slate-900">
                    +{store.currency} {totals.taxTotal.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-950 pt-1.5 border-t border-slate-200">
                <span>GRAND TOTAL</span>
                <span className="text-black font-mono font-black">
                  {store.currency} {totals.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Checkout Buttons (Black & White style) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => initiateCheckout('cash')}
                className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => initiateCheckout('online')}
                className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Card/UPI</span>
              </button>

              <button
                type="button"
                onClick={() => initiateCheckout('khata')}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer ${
                  selectedCustomerId
                    ? 'bg-slate-700 hover:bg-slate-600'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Khata</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unit Selector Modal */}
      {modalProduct && (
        <UnitSelectionModal
          product={modalProduct}
          store={store}
          onClose={() => setModalProduct(null)}
          onAddToCart={handleAddToCartFromModal}
        />
      )}

      {/* Payment / Cash Tender Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-950">
                {paymentMethod === 'cash' && <DollarSign className="w-5 h-5 text-black" />}
                {paymentMethod === 'online' && <CreditCard className="w-5 h-5 text-slate-700" />}
                {paymentMethod === 'khata' && <BookOpen className="w-5 h-5 text-slate-700" />}
                Confirm {paymentMethod.toUpperCase()} Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-bold uppercase">Total Payable Amount</span>
              <p className="text-2xl font-black text-black font-mono">
                {store.currency} {totals.grandTotal.toLocaleString()}
              </p>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Cash Received from Customer
                </label>
                <input
                  type="number"
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xl font-bold font-mono text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                />

                <div className="flex flex-wrap gap-2">
                  {[
                    totals.grandTotal,
                    Math.ceil(totals.grandTotal / 100) * 100,
                    Math.ceil(totals.grandTotal / 500) * 500,
                    1000,
                    5000,
                  ]
                    .filter((val, idx, arr) => val >= totals.grandTotal && arr.indexOf(val) === idx)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashTendered(val)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-300 cursor-pointer"
                      >
                        {store.currency} {val.toLocaleString()}
                      </button>
                    ))}
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-bold">Change to Return:</span>
                  <span className="text-lg font-black text-black font-mono">
                    {store.currency}{' '}
                    {Math.max(0, roundToDecimals(cashTendered - totals.grandTotal, 2)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'khata' && (
              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <p className="font-bold text-slate-900">
                  Customer: {selectedCustomer?.name}
                </p>
                <p className="text-slate-600">
                  Current Udhaar: {store.currency} {selectedCustomer?.currentBalance.toLocaleString()}
                </p>
                <p className="text-slate-800 font-bold">
                  New Balance will be:{' '}
                  <strong className="text-black">
                    {store.currency}{' '}
                    {roundToDecimals(
                      (selectedCustomer?.currentBalance || 0) + totals.grandTotal,
                      2
                    ).toLocaleString()}
                  </strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="px-6 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Complete Sale &amp; Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Sale Thermal Slip Modal */}
      {completedOrder && (
        <ThermalReceiptModal
          order={completedOrder}
          store={store}
          customer={selectedCustomer}
          onClose={() => setCompletedOrder(null)}
          onNewSale={() => {
            setCompletedOrder(null);
            clearCart();
          }}
        />
      )}
    </div>
  );
};
