const PRICE_HISTORY_KEY = "retail_inventory_price_history";

function readHistory() {
  return JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || "[]");
}

function writeHistory(rows) {
  localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(rows));
}

export function recordPriceHistory(product, source = "barang") {
  const basePrice = Number(product.basePrice ?? product.base_price ?? 0);
  if (!product?.name || basePrice <= 0) return;

  const rows = readHistory();
  const lastRow = rows.find((row) => String(row.productId) === String(product.id));
  const isSamePrice = lastRow && Number(lastRow.basePrice) === basePrice;

  if (isSamePrice) return;

  writeHistory([
    {
      id: Date.now(),
      productId: product.id ?? product.name,
      productName: product.name,
      basePrice,
      source,
      recordedAt: new Date().toISOString()
    },
    ...rows
  ]);
}

export function listPriceHistory() {
  return readHistory();
}
