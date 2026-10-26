export const IMPORT_LIMITS = { bytes: 2 * 1024 * 1024, rows: 200, columns: 12, cell: 4000 } as const;
export const IMPORT_COLUMNS = ["sku", "name", "price", "stock", "description", "category_id", "cost"] as const;
export type ImportRow = { sku: string; name: string; price: number; stock: number | null; description: string; categoryId: string | null; cost: number | null };
export type ImportPreview = { rows: ImportRow[]; errors: { row: number; message: string }[] };
const dangerousCell = /^[\s\u0000-\u001f]*[=+@-]/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateImportRecords(records: string[][]): ImportPreview {
  if (records.length < 2 || records.length > IMPORT_LIMITS.rows + 1) throw new Error("Faylda 1–200 məhsul olmalıdır.");
  const header = records[0].map((cell) => cell.trim().toLowerCase());
  if (header.length > IMPORT_LIMITS.columns || new Set(header).size !== header.length ||
      header.some((key) => !IMPORT_COLUMNS.includes(key as typeof IMPORT_COLUMNS[number])) ||
      !["sku", "name", "price"].every((key) => header.includes(key))) throw new Error("Şablon sütunlarından istifadə edin.");
  const result: ImportPreview = { rows: [], errors: [] };
  const skus = new Set<string>();
  for (const [index, cells] of records.slice(1).entries()) {
    try {
      if (cells.length !== header.length || cells.some((cell) => cell.length > IMPORT_LIMITS.cell || dangerousCell.test(cell))) throw new Error("Sütun sayı, xana uzunluğu və ya formula qəbul edilmir.");
      const row = Object.fromEntries(header.map((key, i) => [key, cells[i].trim()]));
      const sku = row.sku.toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(sku)) throw new Error("SKU 1–64 hərf, rəqəm, nöqtə, tire və alt xətdən ibarət olmalıdır.");
      if (skus.has(sku)) throw new Error("Faylda təkrar SKU var.");
      skus.add(sku);
      if (!row.name || row.name.length > 200) throw new Error("Məhsul adı 1–200 simvol olmalıdır.");
      const money = (value: string) => /^\d{1,8}(\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
      const price = money(row.price);
      const cost = row.cost ? money(row.cost) : null;
      const stock = row.stock ? Number(row.stock) : null;
      if (!Number.isFinite(price) || (cost !== null && !Number.isFinite(cost))) throw new Error("Qiyməti müsbət rəqəm və ən çox iki onluqla yazın.");
      if (stock !== null && (!/^\d+$/.test(row.stock) || !Number.isSafeInteger(stock) || stock > 2147483647)) throw new Error("Stok tam müsbət rəqəm olmalıdır.");
      if (row.category_id && !uuid.test(row.category_id)) throw new Error("Kateqoriya ID-si düzgün deyil.");
      result.rows.push({ sku, name: row.name, price, cost, stock, description: row.description ?? "", categoryId: row.category_id || null });
    } catch (error) {
      result.errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Sətir düzgün deyil." });
    }
  }
  return result;
}
