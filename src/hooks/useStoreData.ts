import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  StoreUser,
  Product,
  Customer,
  KhataTransaction,
  Order,
  StoreRole,
  ProductCategory,
  UnitCategory,
} from '../types';
import {
  INITIAL_STORES,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_KHATA_TRANSACTIONS,
  INITIAL_ORDERS,
} from '../lib/mockData';
import { calculateStockDeductionInBaseUnits } from '../lib/calculations';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  STORES: 'kiryanaflow_stores_v2',
  USERS: 'kiryanaflow_users_v2',
  CURRENT_STORE_ID: 'kiryanaflow_active_store_v2',
  CURRENT_ROLE: 'kiryanaflow_active_role_v2',
  CURRENT_USER: 'kiryanaflow_current_user_v2',
  PRODUCTS: 'kiryanaflow_products_v2',
  CUSTOMERS: 'kiryanaflow_customers_v2',
  KHATA_TXS: 'kiryanaflow_khata_txs_v2',
  ORDERS: 'kiryanaflow_orders_v2',
  CATEGORIES: 'kiryanaflow_categories_v2',
};

export function useStoreData() {
  // Start with null so login screen opens when run
  const [currentUser, setCurrentUser] = useState<StoreUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<StoreUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!saved) return INITIAL_USERS;
    try {
      const parsed: StoreUser[] = JSON.parse(saved);
      const merged = [...parsed];
      for (const initU of INITIAL_USERS) {
        const idx = merged.findIndex(
          (u) => (u.cnic || '').replace(/\D/g, '') === (initU.cnic || '').replace(/\D/g, '')
        );
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...initU };
        } else {
          merged.unshift(initU);
        }
      }
      return merged;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STORES);
    return saved ? JSON.parse(saved) : INITIAL_STORES;
  });

  const [activeStoreId, setActiveStoreId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_STORE_ID) || INITIAL_STORES[0].id;
  });

  const [currentRole, setCurrentRole] = useState<StoreRole>(() => {
    return (localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE) as StoreRole) || 'super_admin';
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [khataTransactions, setKhataTransactions] = useState<KhataTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.KHATA_TXS);
    return saved ? JSON.parse(saved) : INITIAL_KHATA_TRANSACTIONS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [categories, setCategories] = useState<ProductCategory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return saved ? JSON.parse(saved) : [];
  });

  // LocalStorage persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_STORE_ID, activeStoreId);
  }, [activeStoreId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, currentRole);
  }, [currentRole]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.KHATA_TXS, JSON.stringify(khataTransactions));
  }, [khataTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  // Sync with Supabase on mount
  const syncFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // 1. Fetch Users first so we can map owner details to stores
      const { data: dbUsers } = await supabase.from('store_users').select('*');
      const userList = Array.isArray(dbUsers) ? dbUsers : [];

      if (userList.length > 0) {
        const mappedUsers: StoreUser[] = userList.map((u: any) => ({
          id: u.id,
          storeId: u.store_id || u.storeId || '',
          userId: u.user_id || u.userId || u.id,
          fullName: u.full_name || u.fullName || 'User',
          cnic: u.cnic || '',
          phone: u.phone || '',
          password: u.password || '',
          role: u.role || 'store_owner',
        }));

        setUsers((prev) => {
          const combined = [...mappedUsers];
          for (const p of prev) {
            if (!combined.some((c) => (c.cnic || '').replace(/\D/g, '') === (p.cnic || '').replace(/\D/g, ''))) {
              combined.push(p);
            }
          }
          return combined;
        });
      }

      // 2. Fetch Stores from Supabase
      const { data: dbStores } = await supabase.from('stores').select('*');
      if (dbStores && Array.isArray(dbStores)) {
        const ownerMap = new Map();
        for (const u of userList) {
          if (u.store_id && (u.role === 'store_owner' || !ownerMap.has(u.store_id))) {
            ownerMap.set(u.store_id, u);
          }
        }

        const mappedStores: Store[] = dbStores.map((s: any) => {
          const owner = ownerMap.get(s.id);
          return {
            id: s.id,
            name: s.name,
            slug: s.slug || '',
            phone: s.phone || owner?.phone || '',
            address: s.address || '',
            currency: s.currency || 'PKR',
            taxRate: Number(s.tax_rate ?? 0),
            status: s.status || 'active',
            ownerName: s.owner_name || owner?.full_name || '',
            ownerCnic: s.owner_cnic || owner?.cnic || '',
            createdAt: s.created_at || new Date().toISOString(),
          };
        });

        setStores(mappedStores);
      }

      // 3. Fetch Products from Supabase
      const { data: dbProducts } = await supabase.from('products').select('*');
      if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
        const mappedProducts: Product[] = dbProducts.map((p: any) => ({
          id: p.id,
          storeId: p.store_id || p.storeId || '',
          name: p.name || '',
          category: p.category || 'General',
          barcode: p.barcode || '',
          baseUnit: p.base_unit || p.baseUnit || 'pcs',
          costPrice: Number(p.cost_price ?? p.costPrice ?? 0),
          retailPrice: Number(p.retail_price ?? p.retailPrice ?? 0),
          stockInBaseUnits: Number(p.stock_in_base_units ?? p.stockInBaseUnits ?? 0),
          minStockAlert: Number(p.min_stock_alert ?? p.minStockAlert ?? 5),
          hasVariants: p.has_variants ?? p.hasVariants ?? false,
          imageUrl: p.image_url || p.imageUrl || undefined,
          createdAt: p.created_at || p.createdAt || new Date().toISOString(),
        }));
        setProducts(mappedProducts);
      }

      // 4. Fetch Customers from Supabase
      const { data: dbCustomers } = await supabase.from('customers').select('*');
      if (dbCustomers && Array.isArray(dbCustomers) && dbCustomers.length > 0) {
        const mappedCustomers: Customer[] = dbCustomers.map((c: any) => ({
          id: c.id,
          storeId: c.store_id || c.storeId || '',
          name: c.name || '',
          phone: c.phone || '',
          address: c.address || undefined,
          creditLimit: Number(c.credit_limit ?? c.creditLimit ?? 0),
          currentBalance: Number(c.current_balance ?? c.currentBalance ?? 0),
          createdAt: c.created_at || c.createdAt || new Date().toISOString(),
          lastTransactionAt: c.last_transaction_at || c.lastTransactionAt || undefined,
        }));
        setCustomers(mappedCustomers);
      }

      // 5. Fetch Khata Transactions from Supabase
      const { data: dbKhata } = await supabase.from('khata_transactions').select('*');
      if (dbKhata && Array.isArray(dbKhata) && dbKhata.length > 0) {
        const mappedKhata: KhataTransaction[] = dbKhata.map((t: any) => ({
          id: t.id,
          storeId: t.store_id || t.storeId || '',
          customerId: t.customer_id || t.customerId || '',
          orderId: t.order_id || t.orderId || undefined,
          type: t.type || 'debit',
          amount: Number(t.amount ?? 0),
          balanceAfter: Number(t.balance_after ?? t.balanceAfter ?? 0),
          description: t.description || '',
          paymentMode: t.payment_mode || t.paymentMode || undefined,
          createdAt: t.created_at || t.createdAt || new Date().toISOString(),
          createdBy: t.created_by || t.createdBy || '',
        }));
        setKhataTransactions(mappedKhata);
      }

      // 6. Fetch Orders from Supabase
      const { data: dbOrders } = await supabase.from('orders').select('*');
      if (dbOrders && Array.isArray(dbOrders) && dbOrders.length > 0) {
        const mappedOrders: Order[] = dbOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number || o.orderNumber || o.id,
          storeId: o.store_id || o.storeId || '',
          cashierId: o.cashier_id || o.cashierId || '',
          cashierName: o.cashier_name || o.cashierName || '',
          customerId: o.customer_id || o.customerId || undefined,
          customerName: o.customer_name || o.customerName || undefined,
          items: o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : [],
          subtotal: Number(o.subtotal ?? 0),
          discountTotal: Number(o.discount_total ?? o.discountTotal ?? 0),
          taxTotal: Number(o.tax_total ?? o.taxTotal ?? 0),
          grandTotal: Number(o.grand_total ?? o.grandTotal ?? 0),
          paymentMethod: o.payment_method || o.paymentMethod || 'cash',
          cashPaid: o.cash_paid != null ? Number(o.cash_paid) : undefined,
          changeDue: o.change_due != null ? Number(o.change_due) : undefined,
          khataAmount: o.khata_amount != null ? Number(o.khata_amount) : undefined,
          notes: o.notes || undefined,
          status: o.status || 'completed',
          createdAt: o.created_at || o.createdAt || new Date().toISOString(),
        }));
        setOrders(mappedOrders);
      }

    } catch (err) {
      console.warn('Supabase sync notice:', err);
    }
  }, []);

  // Multi-device sync: poll every 3 seconds + sync on window focus/tab change
  useEffect(() => {
    syncFromSupabase();

    const interval = setInterval(() => {
      syncFromSupabase();
    }, 3000);

    const onFocus = () => {
      syncFromSupabase();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
    };
  }, [syncFromSupabase]);

  // Tenant-Scoped Data
  const currentStore = stores.find((s) => s.id === activeStoreId) || stores[0];
  const storeProducts = products.filter((p) => p.storeId === activeStoreId);
  const storeCategories = categories.filter((c) => c.storeId === activeStoreId);
  const storeCustomers = customers.filter((c) => c.storeId === activeStoreId);
  const storeOrders = orders.filter((o) => o.storeId === activeStoreId);
  const storeKhataTxs = khataTransactions.filter((tx) => tx.storeId === activeStoreId);

  // ── AUTHENTICATION: LOGIN BY CNIC & PASSWORD ───────────────────
  const loginWithCnic = async (cnicInput: string, passwordInput: string) => {
    const cleanInputCnic = (cnicInput || '').replace(/\D/g, '');
    const cleanPassInput = (passwordInput || '').trim();

    // 1. Check in local users & INITIAL_USERS
    const allKnownUsers = [...users, ...INITIAL_USERS];
    let matchedUser = allKnownUsers.find((u) => {
      const userCnicClean = (u.cnic || '').replace(/\D/g, '');
      const cnicMatch = userCnicClean === cleanInputCnic;
      const passMatch = !u.password || (u.password || '').trim() === cleanPassInput;
      return cnicMatch && passMatch;
    });

    // 2. If not matched locally and Supabase is configured, check directly in Supabase
    if (!matchedUser && isSupabaseConfigured && supabase) {
      try {
        const { data: dbUsers } = await supabase.from('store_users').select('*');
        if (dbUsers && Array.isArray(dbUsers)) {
          const found = dbUsers.find((u: any) => {
            const cleanDbCnic = (u.cnic || '').replace(/\D/g, '');
            const cnicMatch = cleanDbCnic === cleanInputCnic;
            const passMatch = !u.password || (u.password || '').trim() === cleanPassInput;
            return cnicMatch && passMatch;
          });

          if (found) {
            matchedUser = {
              id: found.id,
              storeId: found.store_id || found.storeId || '',
              userId: found.user_id || found.userId || found.id,
              fullName: found.full_name || found.fullName || '',
              cnic: found.cnic || '',
              phone: found.phone || '',
              password: found.password || '',
              role: found.role || 'store_owner',
            };
            setUsers((prev) => [matchedUser!, ...prev.filter((u) => u.id !== matchedUser!.id)]);
          }
        }
      } catch (err) {
        console.warn('Direct Supabase login query notice:', err);
      }
    }

    if (!matchedUser) {
      return {
        success: false,
        error: 'Galat CNIC ya Password hai. Dobara check karein.',
      };
    }

    // 3. If Super Admin, grant platform access
    if (matchedUser.role === 'super_admin') {
      setCurrentUser(matchedUser);
      setCurrentRole('super_admin');
      return {
        success: true,
        user: matchedUser,
      };
    }

    // 4. If Store Owner or Cashier, verify store status
    let targetStore = stores.find((s) => s.id === matchedUser.storeId);

    // If target store not in memory yet, check Supabase stores
    if (!targetStore && isSupabaseConfigured && supabase) {
      try {
        const { data: dbStores } = await supabase.from('stores').select('*');
        if (dbStores && Array.isArray(dbStores)) {
          const mappedStores: Store[] = dbStores.map((s: any) => ({
            id: s.id,
            name: s.name,
            slug: s.slug || '',
            phone: s.phone || '',
            address: s.address || '',
            currency: s.currency || 'PKR',
            taxRate: Number(s.tax_rate ?? 0),
            status: s.status || 'active',
            ownerName: s.owner_name || '',
            ownerCnic: s.owner_cnic || '',
            createdAt: s.created_at || new Date().toISOString(),
          }));
          setStores(mappedStores);
          targetStore = mappedStores.find((s) => s.id === matchedUser!.storeId);
        }
      } catch (err) {
        console.warn('Store fetch error:', err);
      }
    }

    if (!targetStore) {
      return {
        success: false,
        error: 'Is user ka koi store registered nahi hai.',
      };
    }

    if (targetStore.status === 'suspended') {
      return {
        success: false,
        error: 'Aapka store filhal Inactive (Suspended) hai. Baraye meherbani Super Admin se rabta karein.',
      };
    }

    // Successful store login
    setCurrentUser(matchedUser);
    setCurrentRole(matchedUser.role);
    setActiveStoreId(targetStore.id);

    return {
      success: true,
      user: matchedUser,
      store: targetStore,
    };
  };

  const logoutUser = () => {
    setCurrentUser(null);
  };

  // ── SUPER ADMIN ACTIONS: CREATE STORE WITH CREDENTIALS ──────────
  const createStoreWithCredentials = (params: {
    storeName: string;
    ownerName: string;
    cnic: string;
    password: string;
    phone: string;
    address?: string;
  }): Store => {
    const storeId = `store-${Date.now().toString(36)}`;
    const userId = `usr-${Date.now().toString(36)}`;

    const newStore: Store = {
      id: storeId,
      name: params.storeName,
      slug: params.storeName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      phone: params.phone,
      address: params.address || '',
      currency: 'PKR',
      taxRate: 0.0,
      status: 'active',
      ownerName: params.ownerName,
      ownerCnic: params.cnic,
      createdAt: new Date().toISOString(),
    };

    const newOwnerUser: StoreUser = {
      id: userId,
      storeId: storeId,
      userId: `auth-${userId}`,
      fullName: params.ownerName,
      cnic: params.cnic,
      phone: params.phone,
      password: params.password,
      role: 'store_owner',
    };

    setStores((prev) => [newStore, ...prev]);
    setUsers((prev) => [newOwnerUser, ...prev]);

    // Sync to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      supabase.from('stores').insert({
        id: newStore.id,
        name: newStore.name,
        slug: newStore.slug,
        phone: newStore.phone,
        address: newStore.address,
        currency: 'PKR',
        status: 'active',
      });

      supabase.from('store_users').insert({
        id: newOwnerUser.id,
        store_id: newStore.id,
        full_name: newOwnerUser.fullName,
        cnic: newOwnerUser.cnic,
        phone: newOwnerUser.phone,
        password: newOwnerUser.password,
        email: `${newOwnerUser.cnic.replace(/[^0-9]/g, '')}@kiryana.local`,
        role: 'store_owner',
      });
    }

    return newStore;
  };

  // ── SUPER ADMIN: TOGGLE STORE ACTIVE / INACTIVE ────────────────
  const toggleStoreStatus = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === storeId) {
          const newStatus = s.status === 'active' ? 'suspended' : 'active';
          if (isSupabaseConfigured && supabase) {
            supabase
              .from('stores')
              .update({ status: newStatus })
              .eq('id', storeId);
          }
          return { ...s, status: newStatus };
        }
        return s;
      })
    );
  };

  // ── SUPER ADMIN: DELETE STORE ──────────────────────────────────
  const deleteStore = async (storeId: string) => {
    // 1. Immediately update state
    setStores((prev) => prev.filter((s) => s.id !== storeId));
    setUsers((prev) => prev.filter((u) => u.storeId !== storeId));
    setProducts((prev) => prev.filter((p) => p.storeId !== storeId));
    setCustomers((prev) => prev.filter((c) => c.storeId !== storeId));
    setOrders((prev) => prev.filter((o) => o.storeId !== storeId));
    setKhataTransactions((prev) => prev.filter((t) => t.storeId !== storeId));
    setCategories((prev) => prev.filter((c) => c.storeId !== storeId));

    // 2. Persist immediately to localStorage
    try {
      const savedStores = localStorage.getItem(STORAGE_KEYS.STORES);
      if (savedStores) {
        const filtered = JSON.parse(savedStores).filter((s: Store) => s.id !== storeId);
        localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(filtered));
      }
    } catch {}

    // 3. Delete in Supabase (cascades products, customers, transactions)
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('stores').delete().eq('id', storeId);
        await supabase.from('store_users').delete().eq('store_id', storeId);
      } catch (err) {
        console.warn('Supabase delete store notice:', err);
      }
    }
  };

  // ── PRODUCT CATEGORIES ────────────────────────────────────────
  const saveCategory = (name: string, unitType: UnitCategory) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false as const, error: 'Category name is required.' };
    }
    const duplicate = categories.some(
      (c) => c.storeId === activeStoreId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return { success: false as const, error: 'This category name already exists for this store.' };
    }
    const newCategory: ProductCategory = {
      id: `cat-${Date.now().toString(36)}`,
      storeId: activeStoreId,
      name: trimmed,
      unitType,
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCategory]);
    return { success: true as const, category: newCategory };
  };

  const updateCategory = (id: string, name: string, unitType: UnitCategory) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false as const, error: 'Category name is required.' };
    }
    const duplicate = categories.some(
      (c) => c.id !== id && c.storeId === activeStoreId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return { success: false as const, error: 'A category with this name already exists.' };
    }

    const existing = categories.find((c) => c.id === id);
    if (!existing) {
      return { success: false as const, error: 'Category not found.' };
    }
    const oldName = existing.name;

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: trimmed, unitType } : c))
    );

    // If category name changed, update all products that used old category name
    if (oldName !== trimmed) {
      setProducts((prev) =>
        prev.map((p) =>
          p.storeId === activeStoreId && p.category === oldName
            ? { ...p, category: trimmed }
            : p
        )
      );

      if (isSupabaseConfigured && supabase) {
        supabase
          .from('products')
          .update({ category: trimmed })
          .eq('store_id', activeStoreId)
          .eq('category', oldName);
      }
    }

    return { success: true as const };
  };

  const deleteCategory = (id: string) => {
    const existing = categories.find((c) => c.id === id);
    if (!existing) return;
    const catName = existing.name;

    // 1. Remove from categories
    setCategories((prev) => prev.filter((c) => c.id !== id));

    // 2. Re-assign products in this category to 'General'
    setProducts((prev) =>
      prev.map((p) =>
        p.storeId === activeStoreId && p.category === catName
          ? { ...p, category: 'General' }
          : p
      )
    );

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('products')
        .update({ category: 'General' })
        .eq('store_id', activeStoreId)
        .eq('category', catName);
    }
  };

  // ── PRODUCT CRUD ──────────────────────────────────────────────
  const saveProduct = (
    productData: Omit<Product, 'id' | 'storeId' | 'createdAt'>,
    productId?: string
  ) => {
    if (productId) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...productData } : p))
      );
      if (isSupabaseConfigured && supabase) {
        supabase.from('products').update({
          name: productData.name,
          category: productData.category,
          barcode: productData.barcode,
          base_unit: productData.baseUnit,
          cost_price: productData.costPrice,
          retail_price: productData.retailPrice,
          stock_in_base_units: productData.stockInBaseUnits,
          min_stock_alert: productData.minStockAlert,
          has_variants: productData.hasVariants,
          image_url: productData.imageUrl,
        }).eq('id', productId).eq('store_id', activeStoreId);
      }
    } else {
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now().toString(36)}`,
        storeId: activeStoreId,
        createdAt: new Date().toISOString(),
      };
      setProducts((prev) => [newProduct, ...prev]);
      if (isSupabaseConfigured && supabase) {
        supabase.from('products').insert({
          id: newProduct.id,
          store_id: newProduct.storeId,
          name: newProduct.name,
          category: newProduct.category,
          barcode: newProduct.barcode,
          base_unit: newProduct.baseUnit,
          cost_price: newProduct.costPrice,
          retail_price: newProduct.retailPrice,
          stock_in_base_units: newProduct.stockInBaseUnits,
          min_stock_alert: newProduct.minStockAlert,
          has_variants: newProduct.hasVariants,
          image_url: newProduct.imageUrl || null,
          created_at: newProduct.createdAt,
        });
      }
    }
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (isSupabaseConfigured && supabase) {
      supabase.from('products').delete().eq('id', productId).eq('store_id', activeStoreId);
    }
  };

  const adjustStock = (productId: string, newStockInBaseUnits: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stockInBaseUnits: newStockInBaseUnits } : p))
    );
    if (isSupabaseConfigured && supabase) {
      supabase.from('products').update({ stock_in_base_units: newStockInBaseUnits }).eq('id', productId).eq('store_id', activeStoreId);
    }
  };

  // ── CUSTOMER CRUD ─────────────────────────────────────────────
  const saveCustomer = (
    customerData: Omit<Customer, 'id' | 'storeId' | 'currentBalance' | 'createdAt'>,
    customerId?: string
  ) => {
    if (customerId) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, ...customerData } : c))
      );
      if (isSupabaseConfigured && supabase) {
        supabase.from('customers').update({
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address || null,
          credit_limit: customerData.creditLimit,
        }).eq('id', customerId).eq('store_id', activeStoreId);
      }
    } else {
      const newCustomer: Customer = {
        ...customerData,
        id: `cust-${Date.now().toString(36)}`,
        storeId: activeStoreId,
        currentBalance: 0,
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      if (isSupabaseConfigured && supabase) {
        supabase.from('customers').insert({
          id: newCustomer.id,
          store_id: newCustomer.storeId,
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: newCustomer.address || null,
          credit_limit: newCustomer.creditLimit,
          current_balance: 0,
          created_at: newCustomer.createdAt,
        });
      }
      return newCustomer;
    }
  };

  const deleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (isSupabaseConfigured && supabase) {
      supabase.from('customers').delete().eq('id', customerId).eq('store_id', activeStoreId);
    }
  };

  // ── KHATA TRANSACTION ─────────────────────────────────────────
  const recordKhataTransaction = (params: {
    customerId: string;
    type: 'debit' | 'credit';
    amount: number;
    description: string;
    paymentMode?: 'cash' | 'online' | 'bank_transfer';
    orderId?: string;
  }) => {
    const customer = customers.find((c) => c.id === params.customerId);
    if (!customer) return;

    const balanceDiff = params.type === 'debit' ? params.amount : -params.amount;
    const newBalance = customer.currentBalance + balanceDiff;

    const newTx: KhataTransaction = {
      id: `ktx-${Date.now().toString(36)}`,
      storeId: activeStoreId,
      customerId: params.customerId,
      orderId: params.orderId,
      type: params.type,
      amount: params.amount,
      balanceAfter: newBalance,
      description: params.description,
      paymentMode: params.paymentMode || 'cash',
      createdBy: currentUser ? currentUser.fullName : 'Owner',
      createdAt: new Date().toISOString(),
    };

    setKhataTransactions((prev) => [newTx, ...prev]);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === params.customerId
          ? { ...c, currentBalance: newBalance, lastTransactionAt: new Date().toISOString() }
          : c
      )
    );

    // Save to Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('khata_transactions').insert({
        id: newTx.id,
        store_id: newTx.storeId,
        customer_id: newTx.customerId,
        order_id: newTx.orderId || null,
        type: newTx.type,
        amount: newTx.amount,
        balance_after: newTx.balanceAfter,
        description: newTx.description,
        payment_mode: newTx.paymentMode || null,
        created_by: newTx.createdBy,
        created_at: newTx.createdAt,
      });
      supabase.from('customers').update({
        current_balance: newBalance,
        last_transaction_at: new Date().toISOString(),
      }).eq('id', params.customerId).eq('store_id', activeStoreId);
    }
  };

  // ── POS PROCESS ORDER ─────────────────────────────────────────
  const processOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'storeId' | 'createdAt'>) => {
    const orderNumber = `INV-${new Date().getFullYear()}-${String(storeOrders.length + 1).padStart(4, '0')}`;
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now().toString(36)}`,
      orderNumber,
      storeId: activeStoreId,
      createdAt: new Date().toISOString(),
    };

    // Decrement stock in base units
    setProducts((prev) => {
      const updated = [...prev];
      for (const item of orderData.items) {
        const prodIndex = updated.findIndex((p) => p.id === item.productId);
        if (prodIndex >= 0) {
          const deduction = calculateStockDeductionInBaseUnits(item.quantity, item.conversionFactor);
          const currentStock = updated[prodIndex].stockInBaseUnits;
          updated[prodIndex] = {
            ...updated[prodIndex],
            stockInBaseUnits: Math.max(0, currentStock - deduction),
          };
        }
      }
      return updated;
    });

    if (orderData.paymentMethod === 'khata' && orderData.customerId) {
      recordKhataTransaction({
        customerId: orderData.customerId,
        type: 'debit',
        amount: orderData.grandTotal,
        description: `POS Bill #${orderNumber} (${orderData.items.length} items)`,
        orderId: newOrder.id,
      });
    }

    setOrders((prev) => [newOrder, ...prev]);

    // Save order to Supabase for cross-device sync
    if (isSupabaseConfigured && supabase) {
      supabase.from('orders').insert({
        id: newOrder.id,
        order_number: newOrder.orderNumber,
        store_id: newOrder.storeId,
        cashier_id: newOrder.cashierId,
        cashier_name: newOrder.cashierName,
        customer_id: newOrder.customerId || null,
        customer_name: newOrder.customerName || null,
        items: JSON.stringify(newOrder.items),
        subtotal: newOrder.subtotal,
        discount_total: newOrder.discountTotal,
        tax_total: newOrder.taxTotal,
        grand_total: newOrder.grandTotal,
        payment_method: newOrder.paymentMethod,
        cash_paid: newOrder.cashPaid ?? null,
        change_due: newOrder.changeDue ?? null,
        khata_amount: newOrder.khataAmount ?? null,
        notes: newOrder.notes || null,
        status: newOrder.status,
        created_at: newOrder.createdAt,
      });
    }

    return newOrder;
  };

  const resetDemoData = () => {
    localStorage.clear();
    setStores(INITIAL_STORES);
    setUsers(INITIAL_USERS);
    setActiveStoreId(INITIAL_STORES[0].id);
    setCurrentRole('super_admin');
    setCurrentUser(null);
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setKhataTransactions(INITIAL_KHATA_TRANSACTIONS);
    setOrders(INITIAL_ORDERS);
    setCategories([]);
  };

  return {
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
    products: storeProducts,
    categories: storeCategories,
    allProducts: products,
    customers: storeCustomers,
    orders: storeOrders,
    khataTransactions: storeKhataTxs,
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
  };
}
