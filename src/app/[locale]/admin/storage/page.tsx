import { requireRole } from "@/lib/auth/session";
import { getStorageUsage, formatBytes } from "@/lib/admin/storage/data";
import { StorageRefresh } from "@/components/radmin/storage-refresh";
export const dynamic = "force-dynamic";
export default async function StoragePage() {
  await requireRole(["admin"], "/radmin/storage");
  const data = await getStorageUsage();
  const { machine } = data;
  return (
    <div className="grid gap-5">
      <div className="ra-compact-summary">
        <div>
          <h2 className="text-xl font-semibold">Yaddaş və istifadə</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ölçülər 5 dəqiqə saxlanılır. Son ölçmə:{" "}
            {new Intl.DateTimeFormat("az-AZ", {
              timeStyle: "short",
              timeZone: "Asia/Baku",
            }).format(new Date(data.updatedAt))}
          </p>
        </div>
        <StorageRefresh />
      </div>
      <div className="ra-form-grid">
        {[
          ["VDS disk", machine.disk.used, machine.disk.total],
          ["VDS RAM", machine.ram.used, machine.ram.total],
        ].map(([label, used, total]) => (
          <section className="ra-overview-panel" key={String(label)}>
            <h2>{label}</h2>
            <p className="text-2xl font-semibold">
              {formatBytes(Number(used))}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {formatBytes(Number(total))}
              </span>
            </p>
            <progress
              className="mt-4 h-2 w-full accent-emerald-700"
              value={Number(used)}
              max={Number(total)}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {Math.round((Number(used) / Number(total)) * 100)}% istifadə
              olunur
            </p>
          </section>
        ))}
      </div>
      <div className="ra-form-grid">
        {[
          ["Cloudflare R2", data.r2],
          ["Supabase Storage", data.supabase],
        ].map(([label, usage]) => {
          const u = usage as typeof data.r2;
          return (
            <section key={String(label)} className="ra-overview-panel">
              <h2>{String(label)}</h2>
              <p className="text-2xl font-semibold">
                {u.available
                  ? `${u.complete ? "" : "Ən azı "}${formatBytes(u.bytes)}`
                  : "Ölçü əlçatan deyil"}
              </p>
              {u.available && <p className="mt-2">{u.objects} fayl</p>}
              <p className="mt-3 text-sm text-muted-foreground">{u.message}</p>
            </section>
          );
        })}
      </div>
      <section className="ra-overview-panel">
        <h2>Verilənlər bazası</h2>
        <p>
          {data.database.available
            ? formatBytes(data.database.bytes)
            : data.database.message}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Bu ölçülər api.alisveris.az backend-inə aiddir. Ayrı Supabase Cloud
          layihəsinin plan limitləri bu ölçüyə daxil deyil.
        </p>
      </section>
      <section className="ra-overview-panel">
        <h2>Tətbiqin fayl quruluşu</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Aşağıdakı qovluqlar bir-birinin daxilində ola bilər; ölçüləri toplamaq
          lazım deyil. Faylların məzmunu oxunmur.
        </p>
        <div className="overflow-x-auto">
          <table className="ra-simple-table">
            <thead>
              <tr>
                <th>Qovluq</th>
                <th>Həcm</th>
                <th>Fayl sayı</th>
              </tr>
            </thead>
            <tbody>
              {data.directories.map((d) => (
                <tr key={d.label}>
                  <td>{d.label}</td>
                  <td>
                    {!d.complete && "Ən azı "}
                    {formatBytes(d.bytes)}
                  </td>
                  <td>
                    {d.files}
                    {!d.complete && "+"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Saxlanılan buraxılışlar: {data.releases ?? "Əlçatan deyil"}. İşlək
          versiya və geri dönüş nüsxəsi avtomatik təmizləmədə qorunur.
        </p>
      </section>
      <section className="ra-overview-panel">
        <h2>Serverin cari vəziyyəti</h2>
        <p>Tətbiqin RAM istifadəsi: {formatBytes(machine.appRam)}</p>
        <p className="mt-2">
          CPU: {machine.cpuCount} nüvə · Son 1 dəqiqə yükü:{" "}
          {machine.load.toFixed(2)}
        </p>
      </section>
    </div>
  );
}
