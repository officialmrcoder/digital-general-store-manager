import React, { useState } from 'react';
import { useStoreData } from './hooks/useStoreData';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { Header, AppTab } from './components/common/Header';
import { POSBillingScreen } from './components/pos/POSBillingScreen';
import { InventoryManager } from './components/inventory/InventoryManager';
import { KhataManager } from './components/khata/KhataManager';
import { StoreDashboard } from './components/dashboard/StoreDashboard';
import { SuperAdminView } from './components/admin/SuperAdminView';
import { ThermalReceiptModal } from './components/pos/ThermalReceiptModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { Order } from './types';
import { WifiOff } from 'lucide-react';

export default function App() {
  const {
    currentUser,
    users,
    loginWithCnic,
    logoutUser,
    stores,
    activeStoreId,
    setActiveStoreId,
    currentStore,
    currentRole,
    setCurrentRole,
    products,
    categories,
    customers,
    orders,
    khataTransactions,
    createStoreWithCredentials,
    toggleStoreStatus,
    deleteStore,
    saveCategory,
    updateCategory,
    deleteCategory,
    saveProduct,
    deleteProduct,
    adjustStock,
    saveCustomer,
    deleteCustomer,
    recordKhataTransaction,
    processOrder,
    resetDemoData,
    syncFromSupabase,
  } = useStoreData();

  // If role is super_admin, default to 'admin' tab; otherwise 'pos'
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    return currentRole === 'super_admin' ? 'admin' : 'pos';
  });

  const [reprintOrder, setReprintOrder] = useState<Order | null>(null);
  const isOnline = useOnlineStatus();

  // ── 1. If not logged in, render CNIC Login Screen ─────────────
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={async (cnic, pass) => {
          const result = await loginWithCnic(cnic, pass);
          if (result.success && result.user) {
            setCurrentTab(result.user.role === 'super_admin' ? 'admin' : 'pos');
          }
          return result;
        }}
      />
    );
  }

  // ── 2. Logged In Portal (Clean Light Theme: White & Black) ─────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-900 select-none">
      {/* Offline Status Warning Bar */}
      {!isOnline && (
        <div className="bg-amber-500 text-black px-4 py-1 text-center text-xs font-bold flex items-center justify-center gap-2 shrink-0 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Store data is saved locally</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        stores={stores}
        activeStoreId={activeStoreId}
        onSelectStore={setActiveStoreId}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        onResetData={resetDemoData}
        currentUser={currentUser}
        onLogout={logoutUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col pb-16 sm:pb-0">
        {/* Super Admin Dashboard */}
        {currentTab === 'admin' && (
          <SuperAdminView
            stores={stores}
            users={users}
            activeStoreId={activeStoreId}
            onSelectStore={(id) => {
              setActiveStoreId(id);
              setCurrentTab('pos');
            }}
            onCreateStore={createStoreWithCredentials}
            onToggleStoreStatus={toggleStoreStatus}
            onDeleteStore={deleteStore}
            onRefreshSync={syncFromSupabase}
          />
        )}

        {/* Store POS Terminal */}
        {currentTab === 'pos' && (
          <POSBillingScreen
            store={currentStore}
            products={products}
            customers={customers}
            cashierName={currentUser ? currentUser.fullName : 'Cashier'}
            onProcessOrder={processOrder}
          />
        )}

        {/* Store Inventory Management */}
        {currentTab === 'inventory' && (
          <InventoryManager
            store={currentStore}
            products={products}
            categories={categories}
            onSaveCategory={saveCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onSaveProduct={saveProduct}
            onAdjustStock={adjustStock}
            onDeleteProduct={deleteProduct}
          />
        )}

        {/* Store Customer Khata (Udhaar Ledger) */}
        {currentTab === 'khata' && (
          <KhataManager
            store={currentStore}
            customers={customers}
            khataTransactions={khataTransactions}
            onSaveCustomer={saveCustomer}
            onDeleteCustomer={deleteCustomer}
            onRecordTransaction={recordKhataTransaction}
          />
        )}

        {/* Store Dashboard */}
        {currentTab === 'dashboard' && (
          <StoreDashboard
            store={currentStore}
            orders={orders}
            products={products}
            customers={customers}
            onSelectOrderForPrint={setReprintOrder}
            onNavigateToPOS={() => setCurrentTab('pos')}
          />
        )}
      </main>

      {/* Thermal Receipt Reprint Modal */}
      {reprintOrder && (
        <ThermalReceiptModal
          order={reprintOrder}
          store={currentStore}
          customer={customers.find((c) => c.id === reprintOrder.customerId)}
          onClose={() => setReprintOrder(null)}
          onNewSale={() => {
            setReprintOrder(null);
            setCurrentTab('pos');
          }}
        />
      )}
    </div>
  );
}
