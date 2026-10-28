import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  BookOpen,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Settings,
  LogOut,
  User,
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
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const currentStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
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
        <div className="px-4 py-3 flex items-center justify-between gap-3">

          {/* Brand + Store Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
              KF
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base tracking-tight text-slate-950 leading-none">
                  Kiryana<span className="text-slate-500">Flow</span>
                </h1>
                {currentRole === 'super_admin' ? (
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-900 border border-slate-300 px-1.5 py-0.5 rounded">
                    Super Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Store Portal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-none mt-1 truncate max-w-[180px] sm:max-w-xs font-medium">
                {currentRole === 'super_admin' ? 'Master Control Panel' : currentStore?.name}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* User Badge */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <User className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-slate-900 font-bold truncate max-w-[120px]">
                  {currentUser.fullName}
                </span>
              </div>
            )}

            <PWAInstallButton />

            {/* Store Switcher for Super Admin */}
            {currentRole === 'super_admin' && stores.length > 0 && (
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  title="Switch Store View"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden md:inline">Switch Store</span>
                </button>

                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Select Store</p>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {stores.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onSelectStore(s.id);
                            setShowSettings(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                            activeStoreId === s.id
                              ? 'bg-black text-white'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {s.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-black bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition cursor-pointer"
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
