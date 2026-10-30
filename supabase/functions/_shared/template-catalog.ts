export type SystemEmailTemplate = {key:string;name:string;title:string;body:string;button_label:string};
const define=(key:string,name:string,title:string,body:string,button_label='Hesabda bax'):SystemEmailTemplate=>({key,name,title,body,button_label});
export const SYSTEM_EMAIL_TEMPLATES:SystemEmailTemplate[]=[
 define('password_recovery','Şifrə bərpası','Şifrəni yenilə','Salam {email}, hesabınız üçün şifrə bərpası istənildi. Yeni şifrə təyin etmək üçün aşağıdakı düymədən istifadə edin.','Yeni şifrə təyin et'),
 define('registration_seller_admin','Yeni satıcı → administrator','Yeni satıcı qeydiyyatı','Ad: {ad}\nE-poçt: {email}\nTelefon: {telefon}\nMağaza: {magaza}','İstifadəçiyə bax'),
 define('registration_customer_admin','Yeni alıcı → administrator','Yeni alıcı qeydiyyatı','Ad: {ad}\nE-poçt: {email}\nTelefon: {telefon}','İstifadəçiyə bax'),
 define('welcome','Qeydiyyat → istifadəçi','ALİSVERİS.AZ-a xoş gəldiniz','Salam {ad}, hesabınız yaradıldı. Məhsulları kəşf edə və sifarişlərinizi izləyə bilərsiniz.'),
 define('seller_approved','Satıcı hesabının təsdiqi','Satıcı hesabınız təsdiqləndi','Mağaza panelindən məhsullarınızı idarə edə bilərsiniz.','Mağaza panelinə keç'),
 ...(['created','status','payment'] as const).flatMap(event=>(['customer','seller'] as const).map(audience=>define(
  `order_${event}_${audience}`,`${event==='created'?'Yeni sifariş':event==='status'?'Sifariş statusu':'Ödəniş statusu'} → ${audience==='seller'?'satıcı':'alıcı'}`,
  event==='created'?(audience==='seller'?'Yeni sifariş yaradıldı':'Sifarişiniz qəbul edildi'):event==='status'?'Sifariş statusu yeniləndi':'Sifarişin ödəniş statusu yeniləndi',
  'Sifariş: {sifaris}. Status: {status}.','Sifarişə bax'))),
 define('store_status','Mağaza statusu','Mağaza statusu yeniləndi','{magaza} mağazasının statusu: {status}.','Mağaza panelinə keç'),
 define('message','Yeni müştəri mesajı','Yeni müştəri mesajı','Yeni mesajı mağaza panelindən oxuya bilərsiniz.','Mesajlara bax'),
 define('message_reply','Satıcı cavabı','Mesajınıza cavab gəldi','Cavabı hesabınızda oxuya bilərsiniz.','Mesajlara bax'),
 define('review','Yeni rəy','Məhsula yeni rəy yazıldı','Rəyi mağaza panelindən yoxlaya bilərsiniz.'),
 define('stock_low','Stok xəbərdarlığı','Məhsulun stoku azalır','{mehsul} — qalan stok: {stok}.','Məhsullara bax'),
 define('seller_campaign','Satıcı kampaniyası','{basliq}','{mesaj}','Mağazaya bax'),
 define('notification','Sistem bildirişi','{basliq}','{mesaj}'),
 define('promo','Promo bildirişi','{basliq}','{mesaj}'),
];
export const SYSTEM_TEMPLATE_VARIABLES:Record<string,string[]>={
 seller_campaign:['basliq','mesaj','magaza'],password_recovery:['email'],registration_seller_admin:['ad','email','telefon','magaza'],registration_customer_admin:['ad','email','telefon'],welcome:['ad'],seller_approved:[],store_status:['magaza','status'],message:[],message_reply:[],review:[],stock_low:['mehsul','stok'],notification:['basliq','mesaj'],promo:['basliq','mesaj'],
 ...Object.fromEntries(SYSTEM_EMAIL_TEMPLATES.filter(t=>t.key.startsWith('order_')).map(t=>[t.key,['sifaris','status','magaza','yekun']]))
};
export function systemTemplateKey(job:{kind:string;recipient_role:string;payload:Record<string,unknown>}) {
 if(job.kind==='registration_admin')return job.payload.requested_role==='seller'?'registration_seller_admin':'registration_customer_admin';
 if(job.kind.startsWith('order_'))return `${job.kind}_${job.payload.audience==='seller'?'seller':'customer'}`;
 return SYSTEM_EMAIL_TEMPLATES.some(t=>t.key===job.kind)?job.kind:null;
}
export function fillEmailTemplate(text:string,variables:Record<string,unknown>) {return text.replace(/\{([a-z_]+)\}/g,(_,key)=>String(variables[key]??''));}
export function validateSystemTemplate(value:SystemEmailTemplate) {
 const defaults=SYSTEM_EMAIL_TEMPLATES.find(t=>t.key===value.key);if(!defaults)return false;
 if(!value.title.trim()||value.title.length>160||/[\r\n]/.test(value.title)||!value.body.trim()||value.body.length>20000||!value.button_label.trim()||value.button_label.length>80)return false;
 const all=[value.title,value.body,value.button_label].join('\n');
 if(/\{\{|\}\}/.test(all))return false;
 const variables=all.match(/\{[^{}]*\}/g)||[];
 return variables.every(v=>SYSTEM_TEMPLATE_VARIABLES[value.key]?.includes(v.slice(1,-1)));
}
export const SYSTEM_TEMPLATE_PREVIEW_VARIABLES={ad:'Aysel',email:'alici@example.com',telefon:'+994 50 000 00 00',magaza:'Nümunə mağaza',sifaris:'TEST-1001',status:'Təsdiqləndi',yekun:'120,00 ₼',mehsul:'Nümunə məhsul',stok:'3',basliq:'Yeni bildiriş',mesaj:'Hesabınızla bağlı yeni məlumat var.'};
