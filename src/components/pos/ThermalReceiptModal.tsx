import React from 'react';
import { Printer, X, CheckCircle, Share2, ArrowRight } from 'lucide-react';
import { Order, Store, Customer } from '../../types';

interface ThermalReceiptModalProps {
  order: Order | null;
  store: Store;
  customer?: Customer;
  onClose: () => void;
  onNewSale: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  store,
  customer,
  onClose,
  onNewSale,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*Receipt from ${store.name}*\n` +
      `Bill #${order.orderNumber} | Date: ${new Date(order.createdAt).toLocaleDateString()}\n` +
      `Items: ${order.items.length}\n` +
      `Total: ${store.currency} ${order.grandTotal.toLocaleString()}\n` +
      (order.paymentMethod === 'khata' ? `Payment: Khata (Udhaar)\nCurrent Balance: ${store.currency} ${(customer?.currentBalance || 0).toLocaleString()}\n` : `Paid via: ${order.paymentMethod.toUpperCase()}\n`) +
      `Thank you for your business!`;
    
    const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-200" />
            <span className="font-semibold text-base">Sale Completed Successfully</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-emerald-700 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Slip Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="mx-auto max-w-xs bg-white p-5 border border-dashed border-gray-300 shadow-xs font-mono text-xs text-gray-800 space-y-3">
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">{store.name}</h2>
              <p className="text-[11px] text-gray-600 mt-0.5">{store.address}</p>
              <p className="text-[11px] text-gray-600">Tel: {store.phone}</p>
              <div className="mt-1 inline-block bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-sans font-medium">
                Store ID: {store.id.slice(0, 16)}...
              </div>
            </div>

            {/* Bill Meta */}
            <div className="flex justify-between text-[11px] text-gray-600 pb-1 border-b border-gray-200">
              <div>
                <p><span className="font-semibold">Receipt:</span> {order.orderNumber}</p>
                <p><span className="font-semibold">Cashier:</span> {order.cashierName}</p>
              </div>
              <div className="text-right">
                <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                <p>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Customer Tag */}
            {order.customerName && (
              <div className="bg-amber-50 border border-amber-200 rounded p-1.5 text-[11px]">
                <p className="font-semibold text-amber-900">Customer: {order.customerName}</p>
                {customer?.phone && <p className="text-amber-800 text-[10px]">Phone: {customer.phone}</p>}
              </div>
            )}

            {/* Item List */}
            <div className="space-y-1.5 py-1 border-b border-dashed border-gray-300">
              <div className="flex justify-between font-bold text-[10px] text-gray-500 uppercase">
                <span className="w-1/2">Item / Unit</span>
                <span className="w-1/4 text-center">Qty x Rate</span>
                <span className="w-1/4 text-right">Amount</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] leading-tight">
                  <div className="w-1/2 pr-1">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <span className="text-[10px] text-gray-500 font-sans">
                      Unit: {item.selectedUnit} {item.isBulkUnit && `(${item.conversionFactor} base)`}
                    </span>
                  </div>
                  <div className="w-1/4 text-center text-gray-700">
                    {item.quantity} x {item.unitPrice}
                  </div>
                  <div className="w-1/4 text-right font-medium text-gray-900">
                    {store.currency} {item.totalAmount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] pt-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{store.currency} {order.subtotal.toLocaleString()}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-{store.currency} {order.discountTotal.toLocaleString()}</span>
                </div>
              )}
              {order.taxTotal > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>+{store.currency} {order.taxTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-b border-gray-900 py-1.5 mt-1">
                <span>TOTAL AMOUNT</span>
                <span>{store.currency} {order.grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment & Tendered */}
            <div className="space-y-1 text-[11px] pt-1">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Payment Mode:</span>
                <span className="uppercase font-bold text-emerald-800">{order.paymentMethod}</span>
              </div>
              {order.paymentMethod === 'cash' && order.cashPaid && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Cash Tendered:</span>
                    <span>{store.currency} {order.cashPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Change Returned:</span>
                    <span>{store.currency} {(order.changeDue || 0).toLocaleString()}</span>
                  </div>
                </>
              )}
              {order.paymentMethod === 'khata' && (
                <div className="mt-2 bg-rose-50 border border-rose-200 rounded p-1.5 text-[10px] space-y-0.5">
                  <p className="font-bold text-rose-800">Added to Customer Khata (Udhaar)</p>
                  <div className="flex justify-between text-rose-900">
                    <span>Current Khata Balance:</span>
                    <span className="font-bold">{store.currency} {(customer?.currentBalance || order.grandTotal).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-500 space-y-0.5">
              <p className="font-semibold text-gray-700">Thank you for visiting {store.name}!</p>
              <p>Goods once sold can be exchanged within 3 days with receipt.</p>
              <p className="text-[9px] text-gray-400">Powered by KiryanaFlow Multi-Tenant Cloud POS</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 bg-white p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition"
            >
              <Printer className="w-4 h-4" />
              Print Thermal
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium text-xs transition border border-emerald-200"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp Slip
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onNewSale();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition"
          >
            <span>Next Customer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
