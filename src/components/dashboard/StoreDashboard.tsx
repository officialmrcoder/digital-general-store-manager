import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  BookOpen,
  AlertTriangle,
  Printer,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Store, Order, Product, Customer } from '../../types';

interface StoreDashboardProps {
  store: Store;
  orders: Order[];
  products: Product[];
  customers: Customer[];
  onSelectOrderForPrint: (order: Order) => void;
  onNavigateToPOS: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({
  store,
  orders,
  products,
  customers,
  onSelectOrderForPrint,
  onNavigateToPOS,
}) => {
  // Helper to get today's date in YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State: 'today' | 'all' | 'custom'
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'all' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);

  // Quick day navigation
  const shiftSelectedDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + days);
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;
    setSelectedDate(newDateStr);
    setDateFilterMode(newDateStr === getTodayString() ? 'today' : 'custom');
  };

  // Filter orders according to date filter
  const filteredOrders = useMemo(() => {
    if (dateFilterMode === 'all') {
      return orders;
    }
    const targetDate = dateFilterMode === 'today' ? getTodayString() : selectedDate;
    return orders.filter((o) => {
      const ordDate = new Date(o.createdAt);
      const y = ordDate.getFullYear();
      const m = String(ordDate.getMonth() + 1).padStart(2, '0');
      const d = String(ordDate.getDate()).padStart(2, '0');
      const ordDateStr = `${y}-${m}-${d}`;
      return ordDateStr === targetDate;
    });
  }, [orders, dateFilterMode, selectedDate]);

  // Calculations based on filteredOrders
  const totalSales = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalKhataReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);
  const lowStockItems = products.filter((p) => p.stockInBaseUnits <= p.minStockAlert);

  const cashSales = filteredOrders.filter((o) => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.grandTotal, 0);
  const onlineSales = filteredOrders.filter((o) => o.paymentMethod === 'online').reduce((sum, o) => sum + o.grandTotal, 0);
  const khataSales = filteredOrders.filter((o) => o.paymentMethod === 'khata').reduce((sum, o) => sum + o.grandTotal, 0);

  let totalCost = 0;
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      totalCost += (item.baseCostPrice || 0) * (item.quantity * item.conversionFactor);
    });
  });
  const grossProfit = Math.max(0, totalSales - totalCost);
  const profitMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : 0;

  // Pretty display for current filter
  const formattedFilterDate = useMemo(() => {
    if (dateFilterMode === 'all') return 'All Time (Total)';
    const target = dateFilterMode === 'today' ? getTodayString() : selectedDate;
    const isToday = target === getTodayString();
    const [y, m, d] = target.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dateText = dateObj.toLocaleDateString('en-PK', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return isToday ? `Today (${dateText})` : dateText;
  }, [dateFilterMode, selectedDate]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 text-slate-900 p-3 sm:p-6 pb-28 sm:pb-6 space-y-4 sm:space-y-6 antialiased select-none">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-950">{store.name}</h2>
            <span className="text-[10px] bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-full border border-slate-300">
              Active Store
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Store ID: <span className="font-mono text-slate-700">{store.id}</span> • Currency: {store.currency}
          </p>
        </div>

        <button
          onClick={onNavigateToPOS}
          className="px-5 py-2.5 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Launch POS Register</span>
        </button>
      </div>

      {/* Date Filter & Calendar Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setDateFilterMode('today');
                setSelectedDate(getTodayString());
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Previous / Next Day Arrows */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => shiftSelectedDate(-1)}
              title="Previous Day"
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-black transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2 min-w-[140px] text-center font-mono">
              {formattedFilterDate}
            </span>
            <button
              onClick={() => shiftSelectedDate(1)}
              title="Next Day"
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-black transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Picker Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="date"
              value={dateFilterMode === 'all' ? '' : (dateFilterMode === 'today' ? getTodayString() : selectedDate)}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setDateFilterMode(e.target.value === getTodayString() ? 'today' : 'custom');
                }
              }}
              className="w-full sm:w-auto px-3 py-1.5 pl-8 text-xs font-bold font-mono border border-slate-300 rounded-xl bg-white text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
            />
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {dateFilterMode !== 'today' && (
            <button
              onClick={() => {
                setDateFilterMode('today');
                setSelectedDate(getTodayString());
              }}
              title="Reset to Today"
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              {dateFilterMode === 'all' ? 'Total Sales' : 'Sales (' + formattedFilterDate + ')'}
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-950 font-mono">
            {store.currency} {totalSales.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Across {filteredOrders.length} {dateFilterMode === 'all' ? 'total' : 'filtered'} completed bills
          </span>
        </div>

        {/* Estimated Profit */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px]">Gross Profit ({profitMargin}%)</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">
            {store.currency} {grossProfit.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Cost of goods: {store.currency} {totalCost.toLocaleString()}
          </span>
        </div>

        {/* Total Khata Outstanding */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px]">Khata Receivables</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600 font-mono">
            {store.currency} {totalKhataReceivables.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Owed by customers (Store Ledger)
          </span>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px]">Low Stock Warnings</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">
            {lowStockItems.length}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Items need reordering
          </span>
        </div>
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Revenue by Payment Method ({formattedFilterDate})
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Cash Sales</span>
                <span className="font-mono font-bold text-slate-900">{store.currency} {cashSales.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-black h-full rounded-full transition-all"
                  style={{ width: `${totalSales > 0 ? (cashSales / totalSales) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Digital / Online</span>
                <span className="font-mono font-bold text-slate-900">{store.currency} {onlineSales.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-700 h-full rounded-full transition-all"
                  style={{ width: `${totalSales > 0 ? (onlineSales / totalSales) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Khata (Udhaar) Sales</span>
                <span className="font-mono font-bold text-slate-900">{store.currency} {khataSales.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all"
                  style={{ width: `${totalSales > 0 ? (khataSales / totalSales) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Items List */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Critical Stock Reorder Alerts
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                All inventory levels are optimal. No reorders needed!
              </p>
            ) : (
              lowStockItems.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{prod.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Category: {prod.category} • Base: {prod.baseUnit}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-100 text-amber-900 border border-amber-300">
                    {prod.stockInBaseUnits} {prod.baseUnit} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Invoices &amp; Receipts ({filteredOrders.length})
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Showing records for: <span className="font-bold text-slate-900">{formattedFilterDate}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800 border-collapse">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Date &amp; Time</th>
                <th className="py-2.5 px-3">Payment Method</th>
                <th className="py-2.5 px-3">Items Sold</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No sales recorded for {formattedFilterDate}. Start billing from POS register.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-950">
                      {ord.orderNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {ord.customerName || <span className="text-slate-400 italic">Walk-in</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(ord.createdAt).toLocaleDateString()} {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          ord.paymentMethod === 'cash'
                            ? 'bg-slate-100 text-slate-900 border border-slate-300'
                            : ord.paymentMethod === 'online'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {ord.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {ord.items.length} items
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-black">
                      {store.currency} {ord.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectOrderForPrint(ord)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                        title="Reprint Thermal Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
