begin;
create table public.email_system_templates (
 key text primary key,
 name text not null,
 title text not null check(length(trim(title)) between 1 and 160 and title !~ '[\r\n]'),
 body text not null check(length(trim(body)) between 1 and 20000),
 button_label text not null check(length(trim(button_label)) between 1 and 80),
 updated_at timestamptz not null default now()
);
alter table public.email_system_templates enable row level security;
revoke all on public.email_system_templates from public,anon,authenticated;
grant all on public.email_system_templates to service_role;
insert into public.email_system_templates(key,name,title,body,button_label) values
('password_recovery','Şifrə bərpası','Şifrəni yenilə','Salam {email}, hesabınız üçün şifrə bərpası istənildi. Yeni şifrə təyin etmək üçün aşağıdakı düymədən istifadə edin.','Yeni şifrə təyin et'),
('registration_seller_admin','Yeni satıcı → administrator','Yeni satıcı qeydiyyatı','Ad: {ad}
E-poçt: {email}
Telefon: {telefon}
Mağaza: {magaza}','İstifadəçiyə bax'),
('registration_customer_admin','Yeni alıcı → administrator','Yeni alıcı qeydiyyatı','Ad: {ad}
E-poçt: {email}
Telefon: {telefon}','İstifadəçiyə bax'),
('welcome','Qeydiyyat → istifadəçi','ALİSVERİS.AZ-a xoş gəldiniz','Salam {ad}, hesabınız yaradıldı. Məhsulları kəşf edə və sifarişlərinizi izləyə bilərsiniz.','Hesabda bax'),
('seller_approved','Satıcı hesabının təsdiqi','Satıcı hesabınız təsdiqləndi','Mağaza panelindən məhsullarınızı idarə edə bilərsiniz.','Mağaza panelinə keç'),
('order_created_customer','Yeni sifariş → alıcı','Sifarişiniz qəbul edildi','Sifariş: {sifaris}. Status: {status}.','Sifarişə bax'),
('order_created_seller','Yeni sifariş → satıcı','Yeni sifariş yaradıldı','Sifariş: {sifaris}. Status: {status}.','Sifarişə bax'),
('order_status_customer','Sifariş statusu → alıcı','Sifariş statusu yeniləndi','Sifariş: {sifaris}. Status: {status}.','Sifarişə bax'),
('order_status_seller','Sifariş statusu → satıcı','Sifariş statusu yeniləndi','Sifariş: {sifaris}. Status: {status}.','Sifarişə bax'),
('order_payment_customer','Ödəniş statusu → alıcı','Sifarişin ödəniş statusu yeniləndi','Sifariş: {sifaris}. Status: {status}.','Sifarişə bax'),
('order_payment_seller','Ödəniş statusu → satıcı','Sifarişin ödəniş statusu yeniləndi','Sifariş: {sifaris}. Status: {status}.','Sifarişə bax'),
('store_status','Mağaza statusu','Mağaza statusu yeniləndi','{magaza} mağazasının statusu: {status}.','Mağaza panelinə keç'),
('message','Yeni müştəri mesajı','Yeni müştəri mesajı','Yeni mesajı mağaza panelindən oxuya bilərsiniz.','Mesajlara bax'),
('message_reply','Satıcı cavabı','Mesajınıza cavab gəldi','Cavabı hesabınızda oxuya bilərsiniz.','Mesajlara bax'),
('review','Yeni rəy','Məhsula yeni rəy yazıldı','Rəyi mağaza panelindən yoxlaya bilərsiniz.','Hesabda bax'),
('stock_low','Stok xəbərdarlığı','Məhsulun stoku azalır','{mehsul} — qalan stok: {stok}.','Məhsullara bax'),
('seller_campaign','Satıcı kampaniyası','{basliq}','{mesaj}','Mağazaya bax'),
('notification','Sistem bildirişi','{basliq}','{mesaj}','Hesabda bax'),
('promo','Promo bildirişi','{basliq}','{mesaj}','Hesabda bax');
commit;
