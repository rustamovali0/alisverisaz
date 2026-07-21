import { MediaLibrary } from "@/components/admin/cms/media-library";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getMediaAssets } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireRole(["admin"], "/radmin/media");
  const assets = await getMediaAssets();

  return (
    <DashboardPanel
      title="Media kitabxanası"
      description="CMS şəkillərini Supabase Storage-a yükləyin, URL kopyalayın və istifadə olunmayan faylları silin."
    >
      <MediaLibrary assets={assets} />
    </DashboardPanel>
  );
}
