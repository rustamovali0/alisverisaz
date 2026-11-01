import 'server-only';
import { cache } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
// Internal server-only helper; callers pass their verified current user ID.
export const getSellerEmailStores=cache(async(actor:string):Promise<Array<{id:string;name:string;slug:string}>>=>{
 const db=createSupabaseAdminClient() as any;const {data,error}=await db.rpc('email_seller_eligible_stores',{p_actor:actor});return error?[]:data||[];
});
