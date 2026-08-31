insert into public.platform_settings (key, value)
values (
  'whatsapp_order_template',
  jsonb_build_object(
    'template',
    'Salam, sifariş vermək istəyirəm.

Satıcı: {{seller_name}}
Mağaza: {{store_name}}

{{products}}

Ümumi: {{total}}
Çatdırılma: {{delivery_method}}
Ünvan: {{address}}

Müştəri: {{customer_name}}
Telefon: {{customer_phone}}

Tarix: {{date}} {{time}}'
  )
)
on conflict (key) do nothing;
