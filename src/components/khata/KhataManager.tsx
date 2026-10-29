import React, { useState } from 'react';
import {
  BookOpen,
  UserPlus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  MessageSquare,
  Share2,
  X,
  Trash2,
} from 'lucide-react';
import { Store, Customer, KhataTransaction } from '../../types';

interface KhataManagerProps {
  store: Store;
  customers: Customer[];
  khataTransactions: KhataTransaction[];
  onSaveCustomer: (customerData: Omit<Customer, 'id' | 'storeId' | 'currentBalance' | 'createdAt'>, customerId?: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onRecordTransaction: (params: {
    customerId: string;
    type: 'debit' | 'credit';
    amount: number;
    description: string;
    paymentMode?: 'cash' | 'online' | 'bank_transfer' | 'cheque';
    orderId?: string;
  }) => void | Promise<any>;
}

export const KhataManager: React.FC<KhataManagerProps> = ({
  store,
  customers,
  khataTransactions,
  onSaveCustomer,
  onDeleteCustomer,
  onRecordTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [copiedReminder, setCopiedReminder] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // New customer form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState<number>(20000);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || filteredCustomers[0];

  const customerTransactions = selectedCustomer
    ? khataTransactions.filter((tx) => tx.customerId === selectedCustomer.id)
    : [];

  const totalStoreReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || amount <= 0) return;

    onRecordTransaction({
      customerId: selectedCustomer.id,
      type: paymentType,
      amount,
      description: description || (paymentType === 'credit' ? 'Cash payment received' : 'Manual credit purchase'),
      paymentMode,
    });

    setShowPaymentModal(false);
    setAmount(0);
    setDescription('');
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    onSaveCustomer({
      name: newCustName,
      phone: newCustPhone,
      address: newCustAddress,
      creditLimit: Number(newCustCreditLimit),
    });

    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  const getWhatsAppReminderUrl = (customer: Customer) => {
    const text = `Assalam-o-Alaikum / Hello ${customer.name},\n` +
      `This is a gentle payment reminder from *${store.name}*.\n` +
      `Your current outstanding Khata (Udhaar) balance is *${store.currency} ${customer.currentBalance.toLocaleString()}*.\n` +
      `Please settle at the shop. Thank you!`;

    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const copyReminderText = (customer: Customer) => {
    const text = `Hello ${customer.name}, your current outstanding Khata balance at ${store.name} is ${store.currency} ${customer.currentBalance.toLocaleString()}. Please clear at your earliest convenience. Thank you!`;
    navigator.clipboard.writeText(text);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50 text-slate-900 antialiased select-none">
      {/* LEFT: Customer List & Total Receivables Banner */}
      <div className={`w-full lg:w-96 flex flex-col h-full border-r border-slate-200 bg-white ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
        {/* Receivables Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Khata Receivables
            </span>
            <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-bold">
              {customers.length} Accounts
            </span>
          </div>
          <p className="text-2xl font-black text-red-600 font-mono">
            {store.currency} {totalStoreReceivables.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Total credit pending collection across your store
          </p>
        </div>

        {/* Search & Add Customer Button */}
        <div className="p-3 border-b border-slate-200 flex items-center gap-2 bg-white">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:bg-white"
            />
          </div>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            title="Add Customer"
            className="p-2 rounded-xl bg-black hover:bg-slate-800 text-white shrink-0 transition cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pb-28 sm:pb-6">
          {filteredCustomers.map((cust) => {
            const isSelected = selectedCustomer?.id === cust.id;
            const hasDebt = cust.currentBalance > 0;

            return (
              <div
                key={cust.id}
                onClick={() => {
                  setSelectedCustomerId(cust.id);
                  setMobileView('detail');
                }}
                className={`p-3 cursor-pointer transition flex items-center justify-between ${
                  isSelected ? 'bg-slate-100 border-l-4 border-black' : 'hover:bg-slate-50'
                }`}
              >
                <div className="pr-2">
                  <h4 className="font-bold text-xs text-slate-900 leading-tight">{cust.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{cust.phone}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                    {hasDebt ? "You'll Receive" : 'Clear / Zero'}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      hasDebt ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {store.currency} {cust.currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Detailed Ledger Statement & Action Hub */}
      {selectedCustomer ? (
        <div className={`flex-1 flex flex-col h-full overflow-hidden bg-slate-50 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Customer Profile Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 mb-2 cursor-pointer transition"
              >
                ← Back to Customer List
              </button>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-950">{selectedCustomer.name}</h3>
                <span className="text-[10px] bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  Limit: {store.currency} {selectedCustomer.creditLimit.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-black" />
                  {selectedCustomer.phone}
                </span>
                {selectedCustomer.address && <span>• {selectedCustomer.address}</span>}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => copyReminderText(selectedCustomer)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-700" />
                <span>{copiedReminder ? 'Copied!' : 'Copy SMS'}</span>
              </button>

              <a
                href={getWhatsAppReminderUrl(selectedCustomer)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  setPaymentType('credit');
                  setShowPaymentModal(true);
                }}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-black hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Receive Cash</span>
              </button>

              {onDeleteCustomer && (
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete customer "${selectedCustomer.name}"?`)) {
                      onDeleteCustomer(selectedCustomer.id);
                      setSelectedCustomerId('');
                    }
                  }}
                  title="Delete Customer"
                  className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Outstanding Balance Hero Card */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Outstanding Balance</span>
                <p className="text-xl font-black text-red-600 font-mono mt-0.5">
                  {store.currency} {selectedCustomer.currentBalance.toLocaleString()}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Available Credit Margin</span>
                <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {store.currency}{' '}
                  {Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance).toLocaleString()}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Manual Entry</span>
                  <p className="text-xs text-slate-600 font-medium">Add credit purchase</p>
                </div>
                <button
                  onClick={() => {
                    setPaymentType('debit');
                    setShowPaymentModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  + Add Udhaar
                </button>
              </div>
            </div>
          </div>

          {/* Ledger Statement Table */}
          <div className="flex-1 overflow-y-auto p-4 pb-28 sm:pb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Customer Ledger History
            </h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800 border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Description / Bill #</th>
                    <th className="py-2.5 px-3 text-right">Debit (Udhaar)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Received)</th>
                    <th className="py-2.5 px-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No previous ledger transactions recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{tx.description}</p>
                          <span className="text-[10px] text-slate-400">
                            By {tx.createdBy} {tx.paymentMode && `• ${tx.paymentMode}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                          {tx.type === 'debit' ? `+${store.currency} ${tx.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {tx.type === 'credit' ? `-${store.currency} ${tx.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950">
                          {store.currency} {tx.balanceAfter.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
          <BookOpen className="w-12 h-12 mb-3 opacity-30 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">No Customer Selected</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Select a customer from the left list to review ledger statement.
          </p>
        </div>
      )}

      {/* Payment / Udhaar Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-950">
                {paymentType === 'credit' ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                )}
                <span>{paymentType === 'credit' ? 'Receive Cash Payment' : 'Give Credit (Udhaar)'}</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
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

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Amount ({store.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 1500"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Description / Note
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Cleared bill, partial installment..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              {paymentType === 'credit' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        paymentMode === 'cash'
                          ? 'bg-black text-white border-black'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('online')}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        paymentMode === 'online'
                          ? 'bg-black text-white border-black'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      Online / Bank
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-700 font-bold">New Balance After:</span>
                <span className="text-base font-black font-mono text-black">
                  {store.currency}{' '}
                  {(
                    selectedCustomer.currentBalance +
                    (paymentType === 'debit' ? amount : -amount)
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-black hover:bg-slate-800 text-white font-bold shadow-md cursor-pointer"
                >
                  Confirm &amp; Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-950">
                <UserPlus className="w-5 h-5 text-black" />
                Add New Khata Customer
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Master Asif, Haji Sabir..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Mobile / WhatsApp Number *</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Address / Street</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="House #, Street name..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Credit Limit ({store.currency})</label>
                <input
                  type="number"
                  value={newCustCreditLimit}
                  onChange={(e) => setNewCustCreditLimit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-black hover:bg-slate-800 text-white font-bold shadow-md cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
