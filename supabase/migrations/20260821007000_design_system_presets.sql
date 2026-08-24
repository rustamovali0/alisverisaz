insert into public.platform_settings (key, value)
values (
  'site',
  jsonb_build_object(
    'design',
    jsonb_build_object(
      'themePreset', 'default-marketplace',
      'navbarPreset', 'marketplace',
      'homepagePreset', 'hero-marketplace',
      'productCardPreset', 'classic',
      'productDetailPreset', 'gallery-left',
      'sellerPanelPreset', 'saas',
      'customerPanelPreset', 'cards',
      'adminPanelPreset', 'light-sidebar',
      'buttonPreset', 'rounded',
      'inputPreset', 'outline',
      'cardPreset', 'border',
      'spacingPreset', 'normal',
      'typographyPreset', 'marketplace'
    ),
    'design_draft',
    jsonb_build_object(
      'themePreset', 'default-marketplace',
      'navbarPreset', 'marketplace',
      'homepagePreset', 'hero-marketplace',
      'productCardPreset', 'classic',
      'productDetailPreset', 'gallery-left',
      'sellerPanelPreset', 'saas',
      'customerPanelPreset', 'cards',
      'adminPanelPreset', 'light-sidebar',
      'buttonPreset', 'rounded',
      'inputPreset', 'outline',
      'cardPreset', 'border',
      'spacingPreset', 'normal',
      'typographyPreset', 'marketplace'
    )
  )
)
on conflict (key) do update
set value =
  public.platform_settings.value ||
  jsonb_build_object(
    'design',
    coalesce(
      public.platform_settings.value -> 'design',
      excluded.value -> 'design'
    ),
    'design_draft',
    coalesce(
      public.platform_settings.value -> 'design_draft',
      public.platform_settings.value -> 'design',
      excluded.value -> 'design_draft'
    )
  );

insert into public.theme_settings (
  theme_key,
  name,
  status,
  is_active,
  preview_image_url,
  hero_variant,
  product_card_variant,
  section_order,
  config
)
values
  ('default-marketplace', 'Default Marketplace', 'draft', false, '', 'default', 'classic', '["hero","categories","featured_products","new_products","benefits"]'::jsonb, '{"designPreset":"default-marketplace"}'::jsonb),
  ('minimal', 'Minimal', 'draft', false, '', 'minimal', 'minimal', '["hero","categories","new_products","featured_products","benefits"]'::jsonb, '{"designPreset":"minimal"}'::jsonb),
  ('modern', 'Modern', 'draft', false, '', 'modern', 'premium-hover', '["hero","featured_products","categories","new_products","benefits"]'::jsonb, '{"designPreset":"modern"}'::jsonb),
  ('premium', 'Premium', 'draft', false, '', 'premium', 'premium-hover', '["hero","featured_products","benefits","categories","new_products"]'::jsonb, '{"designPreset":"premium"}'::jsonb),
  ('marketplace-pro', 'Marketplace Pro', 'draft', false, '', 'modern', 'dense-marketplace', '["hero","categories","featured_products","new_products","benefits"]'::jsonb, '{"designPreset":"marketplace-pro"}'::jsonb),
  ('dark-premium', 'Dark Premium', 'draft', false, '', 'premium', 'image-heavy', '["hero","featured_products","new_products","categories","benefits"]'::jsonb, '{"designPreset":"dark-premium"}'::jsonb),
  ('soft-commerce', 'Soft Commerce', 'draft', false, '', 'default', 'classic', '["hero","categories","featured_products","new_products","benefits"]'::jsonb, '{"designPreset":"soft-commerce"}'::jsonb),
  ('corporate', 'Corporate', 'draft', false, '', 'minimal', 'compact', '["hero","categories","featured_products","benefits","new_products"]'::jsonb, '{"designPreset":"corporate"}'::jsonb),
  ('elegant', 'Elegant', 'draft', false, '', 'premium', 'borderless', '["hero","featured_products","categories","benefits","new_products"]'::jsonb, '{"designPreset":"elegant"}'::jsonb),
  ('compact', 'Compact', 'draft', false, '', 'minimal', 'dense-marketplace', '["hero","categories","new_products","featured_products","benefits"]'::jsonb, '{"designPreset":"compact"}'::jsonb)
on conflict (theme_key, status) do update
set
  name = excluded.name,
  preview_image_url = excluded.preview_image_url,
  hero_variant = excluded.hero_variant,
  product_card_variant = excluded.product_card_variant,
  section_order = excluded.section_order,
  config = public.theme_settings.config || excluded.config;
