import { apiRateLimit } from "@/lib/security/api";
import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth/session";
import { IMPORT_COLUMNS } from "@/lib/products/import-validation";
export async function GET() {
  const limited = await apiRateLimit("import_template:get", 10);
  if (limited) return limited;

  await requireRole(["seller"], "/store/dashboard/products/import");
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Məhsullar");
  sheet.addRow([...IMPORT_COLUMNS]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => { column.width = 22; });
  const body = await book.xlsx.writeBuffer();
  return new Response(new Uint8Array(body), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": 'attachment; filename="alisveris-products.xlsx"',
    "Cache-Control": "private, no-store",
  } });
}
