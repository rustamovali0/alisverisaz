"use client";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productImportAction } from "@/lib/products/import-actions";
import type { ImportPreview } from "@/lib/products/import-validation";

export function ProductImport({ storeId }: { storeId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("create");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  async function submit(confirm: boolean) {
    if (!file || busy) return;
    setBusy(true); setMessage("");
    const data = new FormData();
    data.set("file", file); data.set("storeId", storeId); data.set("mode", mode);
    data.set("requestId", requestId); data.set("confirm", confirm ? "yes" : "no");
    try {
      const response = await productImportAction(data);
      if (!response.ok) setMessage(response.message);
      else if (response.preview) setPreview(response.preview);
      else if (response.result) {
        setMessage(`Əlavə edildi: ${response.result.added}. Yeniləndi: ${response.result.updated}. Ötürüldü: ${response.result.skipped}. Xəta: ${response.result.errors}.`);
        setPreview(null);
      }
    } catch { setMessage("Əlaqə kəsildi. Eyni faylla təkrar cəhd edə bilərsiniz."); }
    finally { setBusy(false); }
  }
  return <section className="min-w-0 space-y-5">
    <h1 className="text-2xl font-semibold">Excel/CSV ilə məhsul əlavə et</h1>
    <a className="inline-flex min-h-11 items-center gap-2 underline" href="/api/products/import-template"><Download size={18} /> Excel şablonu</a>
    <label className="block">Import rejimi<select className="mt-2 block min-h-11 w-full rounded-md border p-2" value={mode} disabled={busy} onChange={(e) => { setMode(e.target.value); setPreview(null); setRequestId(crypto.randomUUID()); }}>
      <option value="create">Yeni məhsullar</option><option value="update">Mövcud SKU-ları yenilə</option>
    </select></label>
    <label className="block">Fayl<input className="mt-2 block w-full min-w-0" type="file" accept=".csv,.xlsx" disabled={busy} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setRequestId(crypto.randomUUID()); }} /></label>
    <Button disabled={!file || busy} onClick={() => submit(false)}><Upload size={18} className="mr-2" />{busy ? "Yoxlanılır…" : "Önizləmə"}</Button>
    <p role="status" aria-live="polite">{message}</p>
    {preview && <>
      {preview.errors.map((error) => <p className="text-red-700" key={error.row}>Sətir {error.row}: {error.message}</p>)}
      <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">SKU</th><th className="p-2">Məhsul</th><th className="p-2">Qiymət</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.sku} className="border-t"><td className="p-2">{row.sku}</td><td className="p-2 break-words">{row.name}</td><td className="p-2">{row.price}</td></tr>)}</tbody></table></div>
      <Button disabled={busy || !!preview.errors.length || !preview.rows.length} onClick={() => submit(true)}>Təsdiqlə və import et</Button>
    </>}
  </section>;
}
