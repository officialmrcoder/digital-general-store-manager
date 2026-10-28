import React, { useMemo, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  Edit2,
  Check,
  X,
  TrendingDown,
  ArrowUpDown,
  Filter,
  Trash2,
  Tag,
} from 'lucide-react';
import { Store, Product, UnitConversion, ProductCategory, UnitCategory } from '../../types';

function defaultBaseUnitForType(unitType: UnitCategory): string {
  switch (unitType) {
    case 'weight':
      return 'kg';
    case 'volume':
      return 'liter';
    case 'count':
    default:
      return 'packet';
  }
}

const UNIT_TYPE_OPTIONS: { value: UnitCategory; label: string; hint: string }[] = [
  { value: 'weight', label: 'Weight', hint: 'Sold by kg, gram, etc.' },
  { value: 'count', label: 'Count', hint: 'Sold by piece, packet, etc.' },
  { value: 'volume', label: 'Volume', hint: 'Sold by liter, bottle, etc.' },
];

interface InventoryManagerProps {
  store: Store;
  products: Product[];
  categories: ProductCategory[];
  onSaveCategory: (
    name: string,
    unitType: UnitCategory
  ) => { success: boolean; error?: string; category?: ProductCategory };
  onUpdateCategory?: (
    id: string,
    name: string,
    unitType: UnitCategory
  ) => { success: boolean; error?: string };
  onDeleteCategory?: (id: string) => void;
  onSaveProduct: (productData: Omit<Product, 'id' | 'storeId' | 'createdAt'>, productId?: string) => void;
  onAdjustStock: (productId: string, newStock: number) => void;
  onDeleteProduct?: (productId: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  store,
  products,
  categories,
  onSaveCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSaveProduct,
  onAdjustStock,
  onDeleteProduct,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(0);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryUnitType, setNewCategoryUnitType] = useState<UnitCategory>('count');
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [categoryFormError, setCategoryFormError] = useState('');

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    barcode: '',
    baseUnit: 'kg',
    costPrice: 0,
    retailPrice: 0,
    stockInBaseUnits: 0,
    minStockAlert: 10,
    hasBulkConversion: false,
    bulkUnitName: 'Carton',
    conversionFactor: 24,
    bulkDiscountPercent: 5,
  });

  const filterCategoryNames = useMemo(() => {
    const defined = categories.map((c) => c.name);
    const fromProducts = products.map((p) => p.category).filter(Boolean);
    const merged = [...defined];
    for (const name of fromProducts) {
      if (!merged.some((n) => n.toLowerCase() === name.toLowerCase())) {
        merged.push(name);
      }
    }
    return merged.sort((a, b) => a.localeCompare(b));
  }, [categories, products]);

  const productCategoryOptions = useMemo(() => {
    const names = categories.map((c) => c.name);
    if (editingProduct?.category && !names.some((n) => n === editingProduct.category)) {
      return [...names, editingProduct.category];
    }
    return names;
  }, [categories, editingProduct]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openAddModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      const firstUc = prod.unitConversions?.[0];
      setFormData({
        name: prod.name,
        category: prod.category,
        barcode: prod.barcode,
        baseUnit: prod.baseUnit,
        costPrice: prod.costPrice,
        retailPrice: prod.retailPrice,
        stockInBaseUnits: prod.stockInBaseUnits,
        minStockAlert: prod.minStockAlert,
        hasBulkConversion: !!firstUc,
        bulkUnitName: firstUc?.bulkUnitName || 'Carton',
        conversionFactor: firstUc?.conversionFactor || 24,
        bulkDiscountPercent: firstUc?.bulkPriceDiscountPercent || 0,
      });
    } else {
      setEditingProduct(null);
      const firstCat = categories[0];
      setFormData({
        name: '',
        category: firstCat?.name || '',
        barcode: `896${Math.floor(10000000 + Math.random() * 90000000)}`,
        baseUnit: firstCat ? defaultBaseUnitForType(firstCat.unitType) : 'packet',
        costPrice: 100,
        retailPrice: 120,
        stockInBaseUnits: 50,
        minStockAlert: 10,
        hasBulkConversion: false,
        bulkUnitName: 'Carton',
        conversionFactor: 24,
        bulkDiscountPercent: 5,
      });
    }
    setShowAddModal(true);
  };

  const handleCategorySelect = (categoryName: string) => {
    const cat = categories.find((c) => c.name === categoryName);
    setFormData({
      ...formData,
      category: categoryName,
      baseUnit: cat ? defaultBaseUnitForType(cat.unitType) : formData.baseUnit,
    });
  };

  const startEditCategory = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryUnitType(cat.unitType);
    setCategoryFormError('');
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryUnitType('count');
    setCategoryFormError('');
  };

  const handleCategoryFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryFormError('');

    if (editingCategory) {
      if (!onUpdateCategory) return;
      const result = onUpdateCategory(editingCategory.id, newCategoryName, newCategoryUnitType);
      if (!result.success) {
        setCategoryFormError(result.error || 'Could not update category.');
        return;
      }
      // If we are currently editing a product with this category, update form
      if (formData.category === editingCategory.name) {
        setFormData((prev) => ({
          ...prev,
          category: newCategoryName.trim(),
          baseUnit: defaultBaseUnitForType(newCategoryUnitType),
        }));
      }
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryUnitType('count');
    } else {
      const result = onSaveCategory(newCategoryName, newCategoryUnitType);
      if (!result.success) {
        setCategoryFormError(result.error || 'Could not save category.');
        return;
      }
      setNewCategoryName('');
      setNewCategoryUnitType('count');
      if (showAddModal && result.category) {
        setFormData({
          ...formData,
          category: result.category.name,
          baseUnit: defaultBaseUnitForType(result.category.unitType),
        });
        setShowCategoryModal(false);
      }
    }
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete || !onDeleteCategory) return;
    const catName = categoryToDelete.name;
    onDeleteCategory(categoryToDelete.id);
    if (selectedCategory === catName) {
      setSelectedCategory('All');
    }
    if (formData.category === catName) {
      setFormData((prev) => ({ ...prev, category: 'General' }));
    }
    if (editingCategory?.id === categoryToDelete.id) {
      cancelEditCategory();
    }
    setCategoryToDelete(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category.trim()) {
      return;
    }

    const unitConversions: UnitConversion[] = formData.hasBulkConversion
      ? [
          {
            id: `uc-${Date.now()}`,
            storeId: store.id,
            productId: editingProduct?.id || '',
            bulkUnitName: formData.bulkUnitName,
            baseUnitName: formData.baseUnit,
            conversionFactor: Number(formData.conversionFactor),
            bulkPriceDiscountPercent: Number(formData.bulkDiscountPercent),
          },
        ]
      : [];

    onSaveProduct(
      {
        name: formData.name,
        category: formData.category,
        barcode: formData.barcode,
        baseUnit: formData.baseUnit,
        costPrice: Number(formData.costPrice),
        retailPrice: Number(formData.retailPrice),
        stockInBaseUnits: Number(formData.stockInBaseUnits),
        minStockAlert: Number(formData.minStockAlert),
        hasVariants: false,
        unitConversions,
      },
      editingProduct?.id
    );

    setShowAddModal(false);
  };

  const handleStockAdjustmentConfirm = () => {
    if (!adjustingProduct) return;
    const newStock = Math.max(0, adjustingProduct.stockInBaseUnits + stockDelta);
    onAdjustStock(adjustingProduct.id, newStock);
    setAdjustingProduct(null);
    setStockDelta(0);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 antialiased select-none">
      {/* Top Controls Bar */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">Store Inventory &amp; Stock</h2>
            <p className="text-xs text-slate-500">
              Manage items, prices, bulk conversions, and stock levels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => {
              cancelEditCategory();
              setShowCategoryModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            <span>Manage Categories</span>
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items by name, barcode, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-black text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {filterCategoryNames.length === 0 ? (
            <span className="text-xs text-slate-500 px-2 whitespace-nowrap">
              No categories yet
            </span>
          ) : (
            filterCategoryNames.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-black text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => {
              cancelEditCategory();
              setShowCategoryModal(true);
            }}
            title="Manage Categories"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:text-black hover:border-black text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>Category</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-800 border-collapse">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Cost Price</th>
                <th className="py-3 px-4">Retail Price</th>
                <th className="py-3 px-4">Profit Margin</th>
                <th className="py-3 px-4">Packaging / Bulk</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const margin = prod.retailPrice - prod.costPrice;
                const marginPercent = prod.costPrice > 0 ? ((margin / prod.costPrice) * 100).toFixed(1) : 0;
                const isLowStock = prod.stockInBaseUnits <= prod.minStockAlert;
                const uc = prod.unitConversions?.[0];

                return (
                  <tr key={prod.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">{prod.name}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{prod.category}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      #{prod.barcode}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {store.currency} {prod.costPrice}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 font-mono">
                      {store.currency} {prod.retailPrice} / {prod.baseUnit}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-emerald-700 font-bold">+{store.currency} {margin}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({marginPercent}%)</span>
                    </td>
                    <td className="py-3 px-4">
                      {uc ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-800">
                          <Layers className="w-3 h-3 text-black" />
                          <span>1 {uc.bulkUnitName} = <strong>{uc.conversionFactor} {uc.baseUnitName}</strong></span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Single Unit ({prod.baseUnit})</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            prod.stockInBaseUnits <= 0
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {prod.stockInBaseUnits} {prod.baseUnit}
                        </span>
                        {isLowStock && (
                          <span className="text-amber-600 flex items-center gap-0.5 text-[10px] font-bold" title="Below alert threshold">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAdjustingProduct(prod);
                            setStockDelta(0);
                          }}
                          title="Restock / Adjust Quantity"
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                        >
                          Adjust Stock
                        </button>
                        <button
                          onClick={() => openAddModal(prod)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteProduct && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${prod.name}"?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            title="Delete Item"
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Categories Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-6 text-slate-900 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-black" />
                <h3 className="font-bold text-base text-slate-950">Store Categories</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  cancelEditCategory();
                  setShowCategoryModal(false);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add / Edit Form */}
            <form onSubmit={handleCategoryFormSubmit} className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  {editingCategory ? (
                    <>
                      <Edit2 className="w-3.5 h-3.5 text-black" />
                      <span>Edit Category: <span className="underline">{editingCategory.name}</span></span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-black" />
                      <span>Add New Category</span>
                    </>
                  )}
                </h4>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={cancelEditCategory}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setCategoryFormError('');
                  }}
                  placeholder="e.g. Rice, Beverages, Snacks, Ghee..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Default Unit Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {UNIT_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition text-center ${
                        newCategoryUnitType === opt.value
                          ? 'border-black bg-white shadow-xs font-bold text-black'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="categoryUnitType"
                        value={opt.value}
                        checked={newCategoryUnitType === opt.value}
                        onChange={() => setNewCategoryUnitType(opt.value)}
                        className="sr-only"
                      />
                      <span className="text-xs">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{opt.hint}</span>
                    </label>
                  ))}
                </div>
              </div>

              {categoryFormError && (
                <p className="text-red-600 text-xs font-medium">{categoryFormError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={cancelEditCategory}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition active:scale-95"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Existing Categories ({categories.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">Click edit or delete</span>
              </div>

              {categories.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                  Abhi koi category add nahi hai. Upar form se add karein.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  {categories.map((cat) => {
                    const itemCount = products.filter(
                      (p) => p.category.toLowerCase() === cat.name.toLowerCase()
                    ).length;

                    const isBeingEdited = editingCategory?.id === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className={`p-3 flex items-center justify-between gap-3 text-xs transition ${
                          isBeingEdited ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                            <Tag className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{cat.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {cat.unitType}
                              </span>
                              <span>•</span>
                              <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditCategory(cat)}
                            title="Edit Category"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            title="Delete Category"
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  cancelEditCategory();
                  setShowCategoryModal(false);
                }}
                className="px-5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 text-slate-900 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950">Delete Category?</h4>
                <p className="text-xs text-slate-500 font-medium">"{categoryToDelete.name}"</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kya aap waqai is category ko delete karna chahte hain? Is category ke tamam products 'General' category me shift ho jayenge.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-950">
                {editingProduct ? 'Edit Grocery Product' : 'Add New Grocery Product'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 mb-1 font-bold">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Super Basmati Rice, Tapal Tea..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">Category *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFormError('');
                        setShowCategoryModal(true);
                      }}
                      className="text-[11px] font-bold text-slate-600 hover:text-black underline cursor-pointer"
                    >
                      New category
                    </button>
                  </div>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                  >
                    <option value="" disabled>
                      {productCategoryOptions.length === 0
                        ? 'Add a category first'
                        : 'Select category'}
                    </option>
                    {productCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formData.category && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Type:{' '}
                      {(() => {
                        const t = categories.find((c) => c.name === formData.category)?.unitType;
                        if (!t) return 'From existing product (add a matching category to set type)';
                        return t.charAt(0).toUpperCase() + t.slice(1);
                      })()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Barcode / SKU</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Base Inventory Unit</label>
                  <select
                    value={formData.baseUnit}
                    onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-black focus:bg-white"
                  >
                    <option value="packet">Packet / Pouch</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gram">Gram (g)</option>
                    <option value="bottle">Bottle</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="liter">Liter (L)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Current Stock (in base unit)</label>
                  <input
                    type="number"
                    value={formData.stockInBaseUnits}
                    onChange={(e) => setFormData({ ...formData, stockInBaseUnits: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Cost Price ({store.currency})</label>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Retail Price ({store.currency})</label>
                  <input
                    type="number"
                    value={formData.retailPrice}
                    onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              {/* Bulk Conversion Options */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">Bulk Packaging &amp; Unit Conversion</h4>
                    <p className="text-[11px] text-slate-500">
                      Enable selling by whole Carton, Box, or Bag
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.hasBulkConversion}
                    onChange={(e) => setFormData({ ...formData, hasBulkConversion: e.target.checked })}
                    className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
                  />
                </div>

                {formData.hasBulkConversion && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-slate-600 mb-1 text-[11px] font-bold">Bulk Unit Name</label>
                      <input
                        type="text"
                        value={formData.bulkUnitName}
                        onChange={(e) => setFormData({ ...formData, bulkUnitName: e.target.value })}
                        placeholder="Carton, Bag, Box"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 text-[11px] font-bold">Contains Base Units</label>
                      <input
                        type="number"
                        value={formData.conversionFactor}
                        onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 text-[11px] font-bold">Bulk Discount %</label>
                      <input
                        type="number"
                        value={formData.bulkDiscountPercent}
                        onChange={(e) => setFormData({ ...formData, bulkDiscountPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-black hover:bg-slate-800 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2 text-slate-950">
              <ArrowUpDown className="w-4 h-4 text-black" />
              Adjust Stock: {adjustingProduct.name}
            </h3>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <p className="text-slate-500 font-bold uppercase">Current Stock:</p>
              <p className="text-xl font-black font-mono text-slate-900">
                {adjustingProduct.stockInBaseUnits} {adjustingProduct.baseUnit}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Quantity to Add (+) or Deduct (-)
              </label>
              <input
                type="number"
                value={stockDelta || ''}
                onChange={(e) => setStockDelta(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 50 or -10"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-base focus:outline-none focus:border-black focus:bg-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStockDelta(24)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  +1 Carton (24)
                </button>
                <button
                  type="button"
                  onClick={() => setStockDelta(50)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  +1 Bag (50)
                </button>
                <button
                  type="button"
                  onClick={() => setStockDelta(100)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  +100
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-700 font-bold">New Total Stock:</span>
              <span className="text-base font-black font-mono text-black">
                {Math.max(0, adjustingProduct.stockInBaseUnits + stockDelta)} {adjustingProduct.baseUnit}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStockAdjustmentConfirm}
                className="px-5 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
