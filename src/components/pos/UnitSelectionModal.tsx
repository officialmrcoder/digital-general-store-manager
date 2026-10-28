import React, { useState } from 'react';
import { X, Check, Package, Scale, Layers } from 'lucide-react';
import { Product, CartItem, Store } from '../../types';
import { calculateUnitPriceForUnit, calculateLineItem, roundToDecimals } from '../../lib/calculations';

interface UnitSelectionModalProps {
  product: Product;
  store: Store;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const UnitSelectionModal: React.FC<UnitSelectionModalProps> = ({
  product,
  store,
  onClose,
  onAddToCart,
}) => {
  const isWeightItem = product.baseUnit.toLowerCase() === 'kg' || product.baseUnit.toLowerCase() === 'gram';
  
  // Available unit choices
  const availableUnits: Array<{
    label: string;
    unitKey: string;
    factor: number;
    isBulk: boolean;
    discountPercent?: number;
  }> = [
    {
      label: `Single ${product.baseUnit.toUpperCase()}`,
      unitKey: product.baseUnit,
      factor: 1,
      isBulk: false,
    },
  ];

  // Add standard weight subunits if base is kg
  if (product.baseUnit.toLowerCase() === 'kg') {
    availableUnits.push(
      { label: '250 Grams (1 Pao)', unitKey: 'g', factor: 0.25, isBulk: false },
      { label: '500 Grams (Half Kg)', unitKey: 'g', factor: 0.5, isBulk: false },
    );
  }

  // Add custom bulk conversions (Cartons, Bags, Boxes)
  if (product.unitConversions && product.unitConversions.length > 0) {
    for (const uc of product.unitConversions) {
      availableUnits.push({
        label: `${uc.bulkUnitName} (${uc.conversionFactor} ${uc.baseUnitName})`,
        unitKey: uc.bulkUnitName,
        factor: uc.conversionFactor,
        isBulk: true,
        discountPercent: uc.bulkPriceDiscountPercent,
      });
    }
  }

  const [selectedUnitObj, setSelectedUnitObj] = useState(availableUnits[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Calculate pricing for current selection
  const { unitPrice, effectiveConversionFactor } = calculateUnitPriceForUnit({
    baseRetailPrice: product.retailPrice,
    baseUnit: product.baseUnit,
    targetUnit: selectedUnitObj.unitKey,
    packagingConversionFactor: selectedUnitObj.factor,
    bulkDiscountPercent: selectedUnitObj.discountPercent || 0,
  });

  const lineCalc = calculateLineItem({
    quantity,
    unitPrice,
    discountPercent,
    taxRatePercent: store.taxRate * 100,
  });

  const baseUnitsRequired = roundToDecimals(quantity * effectiveConversionFactor, 3);
  const isOutOfStock = baseUnitsRequired > product.stockInBaseUnits;

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setQuantity(1);
    } else if (val === 'DEL') {
      const str = quantity.toString();
      if (str.length > 1) {
        setQuantity(parseFloat(str.slice(0, -1)) || 1);
      } else {
        setQuantity(1);
      }
    } else if (val === '.') {
      if (!quantity.toString().includes('.')) {
        setQuantity(parseFloat(`${quantity}.0`) || quantity);
      }
    } else {
      const newQty = parseFloat(`${quantity}${val}`);
      if (!isNaN(newQty) && newQty < 10000) {
        setQuantity(newQty);
      }
    }
  };

  const handleConfirm = () => {
    const cartItem: CartItem = {
      cartItemId: `${product.id}-${selectedUnitObj.unitKey}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      selectedUnit: selectedUnitObj.unitKey,
      isBulkUnit: selectedUnitObj.isBulk,
      conversionFactor: effectiveConversionFactor,
      quantity,
      unitPrice,
      baseCostPrice: product.costPrice,
      discountAmount: lineCalc.discountAmount,
      taxAmount: lineCalc.taxAmount,
      totalAmount: lineCalc.lineTotal,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            {isWeightItem ? <Scale className="w-5 h-5 text-emerald-400" /> : <Package className="w-5 h-5 text-emerald-400" />}
            <div>
              <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
              <p className="text-xs text-gray-400">
                Base Retail: {store.currency} {product.retailPrice} / {product.baseUnit} | Stock: {product.stockInBaseUnits} {product.baseUnit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-slate-800 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Unit Selection Options */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Selling Unit / Packaging
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableUnits.map((unit, idx) => {
                const isSelected = selectedUnitObj.unitKey === unit.unitKey && selectedUnitObj.factor === unit.factor;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedUnitObj(unit);
                      setQuantity(1);
                    }}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div>
                      <p className={`font-semibold text-xs ${isSelected ? 'text-emerald-950' : 'text-gray-900'}`}>
                        {unit.label}
                      </p>
                      {unit.discountPercent ? (
                        <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5">
                          {unit.discountPercent}% Bulk Saving
                        </span>
                      ) : null}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector & Touch Keypad */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Quantity ({selectedUnitObj.unitKey})
              </label>
              <span className="text-xs font-medium text-gray-500">
                Rate: <strong className="text-gray-900">{store.currency} {unitPrice.toLocaleString()}</strong> per {selectedUnitObj.unitKey}
              </span>
            </div>

            {/* Quick Quantity Chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[0.25, 0.5, 1, 2, 5, 10].map((quickQty) => (
                <button
                  key={quickQty}
                  type="button"
                  onClick={() => setQuantity(quickQty)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    quantity === quickQty
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {quickQty}
                </button>
              ))}
            </div>

            {/* Stepper Display */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(0.1, roundToDecimals(q - 1, 2)))}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xl font-bold flex items-center justify-center transition"
              >
                -
              </button>
              <div className="flex-1 text-center bg-gray-50 border border-gray-200 rounded-xl py-2 px-4">
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full text-center text-2xl font-black text-gray-900 bg-transparent focus:outline-hidden"
                />
                <p className="text-[11px] text-gray-500">
                  Deducts: <span className="font-semibold text-gray-800">{baseUnitsRequired} {product.baseUnit}</span> from stock
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => roundToDecimals(q + 1, 2))}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xl font-bold flex items-center justify-center transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Stock Warning */}
          {isOutOfStock && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs">
              <strong>Stock Notice:</strong> Required {baseUnitsRequired} {product.baseUnit}, but only {product.stockInBaseUnits} {product.baseUnit} available in inventory.
            </div>
          )}

          {/* Pricing Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Unit Price</span>
              <span>{store.currency} {unitPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Subtotal ({quantity} x {unitPrice})</span>
              <span>{store.currency} {lineCalc.grossSubtotal.toLocaleString()}</span>
            </div>
            {store.taxRate > 0 && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>Tax ({(store.taxRate * 100).toFixed(1)}%)</span>
                <span>+{store.currency} {lineCalc.taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-slate-200">
              <span>Total Item Price</span>
              <span className="text-emerald-700">{store.currency} {lineCalc.lineTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-xs hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Add to Bill ({store.currency} {lineCalc.lineTotal.toLocaleString()})
          </button>
        </div>
      </div>
    </div>
  );
};
