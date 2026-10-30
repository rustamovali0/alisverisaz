import { DashboardPanel } from '@/components/dashboard/dashboard-panel';
import { FeatureBlocked } from '@/components/dashboard/feature-blocked';
import { SellerEmailCenter } from '@/components/seller/email/campaign-center';
import { loadSellerEmailCenter } from '@/lib/email/seller';
export const dynamic='force-dynamic';
export default async function SellerEmailPage(){const initial=await loadSellerEmailCenter();if(!initial.stores.length)return <FeatureBlocked title="E-poçt kampaniyaları" description="Bu bölmə yalnız administratorun icazə verdiyi və önə çıxarılması aktiv olan mağazalara açıqdır."/>;return <DashboardPanel title="E-poçt kampaniyaları" description="Endirim və yeni məhsullarınızı istifadəçilərlə paylaşın."><SellerEmailCenter initial={initial}/></DashboardPanel>}
