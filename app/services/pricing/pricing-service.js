/**
 * Pricing Service
 * Centralized calculation – never calculate in UI
 *
 * Supports:
 * - Unit Pricing (quantity × unitPrice)
 * - Fixed Total Pricing
 * Future: volume discounts, rules, etc.
 */

/**
 * Calculate line total based on pricing type
 * @param {object} item
 * @param {number} item.quantity
 * @param {number} item.unitPrice
 * @param {number} [item.fixedTotal]
 * @param {'unit'|'fixed'} [item.pricingType='unit']
 * @returns {number}
 */
export function calculateLineTotal(item) {
  const qty = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const fixedTotal = Number(item.fixedTotal) || 0;
  const type = item.pricingType || 'unit';

  if (type === 'fixed') {
    return Math.round(fixedTotal);
  }
  return Math.round(qty * unitPrice);
}

/**
 * Calculate document totals
 * @param {Array} items - line items
 * @param {object} options
 * @param {number} [options.discountAmount=0]
 * @param {number} [options.discountPercent=0]
 * @param {number} [options.taxRate=0] - percent
 * @returns {object} { subtotal, discount, tax, grandTotal }
 */
export function calculateDocumentTotals(items = [], options = {}) {
  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0);

  let discount = Number(options.discountAmount) || 0;
  if (options.discountPercent) {
    discount = Math.round(subtotal * (Number(options.discountPercent) / 100));
  }

  const afterDiscount = Math.max(0, subtotal - discount);
  const taxRate = Number(options.taxRate) || 0;
  const tax = Math.round(afterDiscount * (taxRate / 100));
  const grandTotal = afterDiscount + tax;

  return {
    subtotal,
    discount,
    tax,
    grandTotal
  };
}

/**
 * Resolve unit price from product + optional price rule
 * (placeholder for future Price Rules module)
 */
export function resolveUnitPrice(product, quantity = 1, priceRules = []) {
  if (!product) return 0;
  // Future: look up price rules by quantity/product
  return Number(product.defaultPrice) || 0;
}
