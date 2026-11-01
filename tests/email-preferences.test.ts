import {expect,it,vi} from 'vitest';
import{getEmailPreferences,saveEmailPreferences}from'@/lib/email/preferences';
import{query}from'./query';
const m=vi.hoisted(()=>({guard:vi.fn(),server:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({requireRole:m.guard}));vi.mock('@/lib/supabase/server',()=>({createSupabaseServerClient:m.server}));
it('saves preferences only for the authenticated account and preserves disabled choices',async()=>{m.guard.mockResolvedValue({user:{id:'current-user'}});const q=query();m.server.mockResolvedValue({from:()=>q});const f=new FormData();f.set('user_id','another-user');f.set('transactional','off');f.set('marketing','on');expect(await saveEmailPreferences(f)).toMatchObject({ok:true});expect(q.upsert).toHaveBeenCalledWith({user_id:'current-user',transactional:false,marketing:true},{onConflict:'user_id'});expect(m.guard).toHaveBeenCalledWith(['customer','seller'],'/email-preferences')});
it('loads saved choices without replacing false with a default true',async()=>{m.guard.mockResolvedValue({user:{id:'current-user'}});m.server.mockResolvedValue({from:()=>query({data:{transactional:false,marketing:true}})});expect(await getEmailPreferences()).toEqual({available:true,transactional:false,marketing:true})});
it('does not write preferences without authentication',async()=>{m.guard.mockRejectedValue(Error('login required'));const f=new FormData();await expect(saveEmailPreferences(f)).rejects.toThrow('login required');expect(m.server).not.toHaveBeenCalled()});
