import "server-only";
import { parse } from "csv-parse/sync";
import { fromBuffer } from "yauzl";
import ExcelJS from "exceljs";
import { IMPORT_LIMITS, validateImportRecords } from "./import-validation";

async function inspectArchive(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new Error("XLSX arxivi düzgün deyil."));
      let bytes = 0;
      let entries = 0;
      const fail = () => { zip.close(); reject(new Error("XLSX ölçüsü və ya məzmunu qəbul edilmir.")); };
      zip.on("error", fail);
      zip.on("end", resolve);
      zip.on("entry", (entry) => {
        bytes += entry.uncompressedSize;
        if (++entries > 100 || bytes > 8 * 1024 * 1024 ||
            entry.uncompressedSize > Math.max(1024 * 1024, entry.compressedSize * 100) ||
            entry.generalPurposeBitFlag & 1 || /vbaProject|externalLinks|\.\./i.test(entry.fileName)) return fail();
        // Drain each entry to validate actual decompressed size before the workbook parser.
        if (entry.fileName.endsWith("/")) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail();
          let actual = 0;
          stream.on("data", (chunk) => {
            actual += chunk.length;
            if (actual > entry.uncompressedSize || actual > 8 * 1024 * 1024) { stream.destroy(); fail(); }
          });
          stream.on("error", fail);
          stream.on("end", () => zip.readEntry());
        });
      });
      zip.readEntry();
    });
  });
}

export async function parseProductImport(file: File) {
  if (!file.size || file.size > IMPORT_LIMITS.bytes) throw new Error("Fayl ən çox 2 MB ola bilər.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let records: string[][];
  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\0")) throw new Error("CSV məzmunu düzgün deyil.");
    records = parse(text, { bom: true, skip_empty_lines: true, max_record_size: 48000, to: IMPORT_LIMITS.rows + 2 });
  } else if (file.name.toLowerCase().endsWith(".xlsx")) {
    if (bytes.readUInt32LE(0) !== 0x04034b50) throw new Error("Real XLSX faylı seçin.");
    await inspectArchive(bytes);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as never);
    if (workbook.worksheets.length !== 1) throw new Error("Yalnız bir cədvəlli şablon qəbul edilir.");
    const sheet = workbook.worksheets[0];
    if (sheet.rowCount > IMPORT_LIMITS.rows + 1 || sheet.columnCount > IMPORT_LIMITS.columns) throw new Error("Sətir və ya sütun limiti aşılıb.");
    records = [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      for (let i = 1; i <= sheet.columnCount; i++) {
        const value = row.getCell(i).value;
        if (value !== null && typeof value === "object") throw new Error("Formula, link və mürəkkəb xanalar qəbul edilmir.");
        cells.push(value === null ? "" : String(value));
      }
      records.push(cells);
    });
  } else throw new Error("CSV və ya XLSX faylı seçin.");
  return validateImportRecords(records);
}
