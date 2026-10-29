import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  BookOpen,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  LogOut,
  User,
  RefreshCw,
  Cloud,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Store, StoreRole, StoreUser } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';

export type AppTab = 'pos' | 'inventory' | 'khata' | 'dashboard' | 'admin';

interface HeaderProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  stores: Store[];
  activeStoreId: string;
  onSelectStore: (id: string) => void;
  currentRole: StoreRole;
  onChangeRole: (role: StoreRole) => void;
  onResetData: () => void;
  currentUser?: StoreUser | null;
  onLogout?: () => void;
  isSyncing?: boolean;
  onRefreshSync?: () => void;
  lastSyncedAt?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  stores,
  activeStoreId,
  onSelectStore,
  currentRole,
  currentUser,
  onLogout,
  isSyncing = false,
  onRefreshSync,
  lastSyncedAt,
}) => {
  const [showStorePicker, setShowStorePicker] = useState(false);
  const storePickerRef = useRef<HTMLDivElement>(null);
  const currentStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (storePickerRef.current && !storePickerRef.current.contains(e.target as Node)) {
        setShowStorePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Tabs: If Super Admin, show Admin tab; otherwise show Store tabs
  const tabs: Array<{ id: AppTab; label: string; mobileLabel: string; icon: React.FC<{ className?: string }> }> =
    currentRole === 'super_admin'
      ? [
          { id: 'admin', label: 'Stores Admin', mobileLabel: 'Admin', icon: ShieldCheck },
          { id: 'pos', label: 'POS Billing', mobileLabel: 'POS', icon: ShoppingBag },
          { id: 'inventory', label: 'Inventory', mobileLabel: 'Inventory', icon: Package },
          { id: 'khata', label: 'Khata', mobileLabel: 'Khata', icon: BookOpen },
          { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Stats', icon: LayoutDashboard },
        ]
      : [
          { id: 'pos', label: 'POS Billing', mobileLabel: 'POS', icon: ShoppingBag },
          { id: 'inventory', label: 'Inventory', mobileLabel: 'Inventory', icon: Package },
          { id: 'khata', label: 'Khata', mobileLabel: 'Khata', icon: BookOpen },
          { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Stats', icon: LayoutDashboard },
        ];

  return (
    <>
      {/* ── Top Header Bar (Clean White & Black) ─────────── */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-30 select-none">
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">

          {/* Left: Brand + Active Store Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs shrink-0">
              KF
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-slate-950 leading-none">
                  Kiryana<span className="text-slate-500">Flow</span>
                </h1>
                {currentRole === 'super_admin' ? (
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-slate-100 text-slate-900 border border-slate-300 px-1 sm:px-1.5 py-0.5 rounded leading-none shrink-0">
                    Admin
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 sm:px-1.5 py-0.5 rounded leading-none shrink-0">
                    Store
                  </span>
                )}
              </div>

              {/* Active Store Display with 1-click switcher */}
              <div className="relative mt-0.5" ref={storePickerRef}>
                {stores.length > 1 && currentRole === 'super_admin' ? (
                  <button
                    type="button"
                    onClick={() => setShowStorePicker(!showStorePicker)}
                    className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-700 hover:text-black leading-none truncate max-w-[170px] sm:max-w-xs cursor-pointer group"
                  >
                    <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{currentStore?.name || 'Select Store'}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-black shrink-0 transition" />
                  </button>
                ) : (
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-none truncate max-w-[170px] sm:max-w-xs font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{currentStore?.name || 'General Store'}</span>
                  </p>
                )}

                {/* Dropdown for Switching Stores */}
                {showStorePicker && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Switch Active Store</p>
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {stores.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onSelectStore(s.id);
                            setShowStorePicker(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between gap-2 ${
                            activeStoreId === s.id
                              ? 'bg-black text-white'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {activeStoreId === s.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Real-time Cloud Sync Button */}
            {onRefreshSync && (
              <button
                type="button"
                onClick={onRefreshSync}
                disabled={isSyncing}
                title={lastSyncedAt ? `Cloud Synced at ${lastSyncedAt}. Click to refresh.` : 'Sync with Supabase Cloud'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isSyncing
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-black'
                }`}
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className="hidden sm:inline">
                  {isSyncing ? 'Syncing...' : 'Cloud Synced'}
                </span>
                {!isSyncing && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse sm:hidden" />
                )}
              </button>
            )}

            {/* User Badge */}
            {currentUser && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <User className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-slate-900 font-bold truncate max-w-[120px]">
                  {currentUser.fullName}
                </span>
              </div>
            )}

            <PWAInstallButton />

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Log Out"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 hover:border-black bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Desktop Tab Bar (Clean Black & White) ──────── */}
        <div className="hidden sm:flex items-center gap-1.5 px-4 pb-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-slate-600 hover:text-black hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Mobile Bottom Tab Bar ──────────── */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex select-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-2 relative cursor-pointer"
            >
              {/* Active indicator line at top */}
              {isActive && (
                <span className="absolute top-0 left-2 right-2 h-[2px] rounded-full bg-black" />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-black' : 'text-slate-400'
                }`}
              />
              <span
                className={`text-[10px] leading-tight font-medium transition-colors ${
                  isActive ? 'text-black font-bold' : 'text-slate-400'
                }`}
              >
                {tab.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
