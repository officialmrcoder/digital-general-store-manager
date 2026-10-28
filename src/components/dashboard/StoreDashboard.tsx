import React from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  BookOpen,
  AlertTriangle,
  Printer,
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
  const totalSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalKhataReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);
  const lowStockItems = products.filter((p) => p.stockInBaseUnits <= p.minStockAlert);

  const cashSales = orders.filter((o) => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.grandTotal, 0);
  const onlineSales = orders.filter((o) => o.paymentMethod === 'online').reduce((sum, o) => sum + o.grandTotal, 0);
  const khataSales = orders.filter((o) => o.paymentMethod === 'khata').reduce((sum, o) => sum + o.grandTotal, 0);

  let totalCost = 0;
  orders.forEach((o) => {
    o.items.forEach((item) => {
      totalCost += (item.baseCostPrice || 0) * (item.quantity * item.conversionFactor);
    });
  });
  const grossProfit = Math.max(0, totalSales - totalCost);
  const profitMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 text-slate-900 p-4 sm:p-6 space-y-6 antialiased select-none">
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
          className="px-5 py-2.5 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Launch POS Register</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Gross Sales</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-950 font-mono">
            {store.currency} {totalSales.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Across {orders.length} completed transactions
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

        {/* Khata Receivables */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px]">Khata (Udhaar) Due</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600 font-mono">
            {store.currency} {totalKhataReceivables.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Pending from {customers.filter((c) => c.currentBalance > 0).length} customers
          </span>
        </div>

        {/* Low Stock Warning */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider text-[10px]">Low Stock Items</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono">
            {lowStockItems.length} Items
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Need supplier reorder
          </span>
        </div>
      </div>

      {/* Two Column Layout: Payment Split & Low Stock Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Split */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Revenue by Payment Method
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-bold">Cash Register Sales</span>
                <span className="font-mono font-bold text-slate-900">
                  {store.currency} {cashSales.toLocaleString()} ({totalSales > 0 ? ((cashSales / totalSales) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all duration-500"
                  style={{ width: `${totalSales > 0 ? (cashSales / totalSales) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-bold">Card / Online Payment</span>
                <span className="font-mono font-bold text-slate-900">
                  {store.currency} {onlineSales.toLocaleString()} ({totalSales > 0 ? ((onlineSales / totalSales) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-700 rounded-full transition-all duration-500"
                  style={{ width: `${totalSales > 0 ? (onlineSales / totalSales) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-bold">Khata Credit (Udhaar Billed)</span>
                <span className="font-mono font-bold text-slate-900">
                  {store.currency} {khataSales.toLocaleString()} ({totalSales > 0 ? ((khataSales / totalSales) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                  style={{ width: `${totalSales > 0 ? (khataSales / totalSales) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Items List */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Low Stock Warnings ({lowStockItems.length})
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                All inventory items are currently well above reorder thresholds!
              </p>
            ) : (
              lowStockItems.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{prod.name}</p>
                    <span className="text-[10px] text-slate-400">
                      Alert threshold: {prod.minStockAlert} {prod.baseUnit}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
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
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Recent Invoices &amp; Receipts
        </h3>

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
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No sales recorded yet. Start billing from POS register.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
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
