import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Plus,
  Trash2,
  Power,
  Phone,
  CreditCard,
  User,
  MapPin,
  ExternalLink,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Store, StoreUser } from '../../types';

interface SuperAdminViewProps {
  stores: Store[];
  users: StoreUser[];
  activeStoreId: string;
  onSelectStore: (storeId: string) => void;
  onCreateStore: (params: {
    storeName: string;
    ownerName: string;
    cnic: string;
    password: string;
    phone: string;
    address?: string;
  }) => Store;
  onToggleStoreStatus: (storeId: string) => void;
  onDeleteStore: (storeId: string) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  stores,
  users,
  activeStoreId,
  onSelectStore,
  onCreateStore,
  onToggleStoreStatus,
  onDeleteStore,
}) => {
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  // Format CNIC
  const formatCnic = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  };

  // Format Pakistani 11-digit Phone (03001234567)
  const formatPhone = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 11);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!storeName.trim()) {
      setFormError('Store ka naam enter karein.');
      return;
    }
    if (!ownerName.trim()) {
      setFormError('Store owner ka naam enter karein.');
      return;
    }
    const cleanCnic = cnic.trim();
    if (!cleanCnic || cleanCnic.replace(/\D/g, '').length !== 13) {
      setFormError('CNIC 13 digits ka hona chahiye (e.g. 35201-1234567-1).');
      return;
    }
    if (!password.trim()) {
      setFormError('Login password enter karein.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length !== 11) {
      setFormError('Phone number 11 digits ka hona chahiye (e.g. 03001234567).');
      return;
    }

    onCreateStore({
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      cnic: cleanCnic,
      password: password.trim(),
      phone: cleanPhone,
      address: address.trim(),
    });

    setShowModal(false);
    setStoreName('');
    setOwnerName('');
    setCnic('');
    setPassword('');
    setPhone('');
    setAddress('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 text-slate-900 p-4 sm:p-6 select-none antialiased">
      <div className="max-w-6xl mx-auto w-full space-y-6">

        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Super Admin Dashboard
              </h2>
              <p className="text-xs text-slate-500">
                All Kiryana Store Tenants, Credentials &amp; Status Controls
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Store</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Stores</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stores.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active Stores</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {stores.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Inactive Stores</p>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {stores.filter((s) => s.status === 'suspended').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Registered Users</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{users.length}</p>
          </div>
        </div>

        {/* Stores List Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Registered Stores</h3>
            <span className="text-xs text-slate-500 font-mono">{stores.length} Stores Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Store Name</th>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Login CNIC</th>
                  <th className="py-3 px-4">Phone (11 Digits)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((store) => {
                  const owner = users.find((u) => u.storeId === store.id && u.role === 'store_owner');
                  const isActive = store.status === 'active';

                  return (
                    <tr key={store.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{store.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{store.address || 'No address'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {store.ownerName || owner?.fullName || 'N/A'}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {store.ownerCnic || owner?.cnic || 'N/A'}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {store.phone || owner?.phone || 'N/A'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active / Inactive Button */}
                          <button
                            onClick={() => onToggleStoreStatus(store.id)}
                            title={isActive ? 'Deactivate Store' : 'Activate Store'}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                              isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <Power className="w-3 h-3 inline mr-1" />
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Switch To Store View */}
                          <button
                            onClick={() => onSelectStore(store.id)}
                            title="Inspect Store"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Store */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Kya aap waqai store "${store.name}" ko delete karna chahte hain?`)) {
                                onDeleteStore(store.id);
                              }
                            }}
                            title="Delete Store"
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add New Store Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-black" />
                <h3 className="font-bold text-base text-slate-950">Add New Kiryana Store</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Madina Super Store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Store Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haji Aslam"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Owner Phone (11 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-900 mb-1">
                    Owner CNIC (Login Username) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="35201-1234567-1"
                    maxLength={15}
                    value={cnic}
                    onChange={(e) => setCnic(formatCnic(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 font-mono tracking-wider focus:outline-none focus:border-black"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Yehi store owner ka login banega.</p>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-900 mb-1">
                    Login Password *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. store123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-black"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Ye password store owner ko dena hai.</p>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Shop Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop #4, Main Bazar, Lahore"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Save &amp; Create Store
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};
