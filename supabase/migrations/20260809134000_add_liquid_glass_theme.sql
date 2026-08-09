do $$
declare
  theme_config jsonb := '{
    "colors": {
      "pageBackground": "#ecfeff",
      "heroBackground": "#e6fbff",
      "categoriesBackground": "#f8fdff",
      "storesBackground": "#f1fcff",
      "productsBackground": "#eafcff",
      "benefitsBackground": "#f8fdff",
      "cardBackground": "#ffffff",
      "text": "#071827",
      "mutedText": "#4b6473",
      "primary": "#06b6d4",
      "accent": "#8b5cf6",
      "buttonBackground": "#0891b2",
      "buttonText": "#ffffff",
      "border": "#bdebf3"
    }
  }'::jsonb;
  theme_order text[] := array[
    'hero',
    'featured_products',
    'categories',
    'new_products',
    'benefits'
  ];
begin
  if to_regclass('public.theme_settings') is null then
    return;
  end if;

  if exists (
    select 1
    from public.theme_settings
    where theme_key = 'liquid-glass'
  ) then
    update public.theme_settings
    set
      name = 'Liquid Glass',
      status = 'published',
      preview_image_url = coalesce(nullif(preview_image_url, ''), ''),
      hero_variant = 'liquid',
      product_card_variant = 'liquid-glass',
      section_order = theme_order,
      config = jsonb_set(coalesce(config, '{}'::jsonb), '{colors}', theme_config -> 'colors', true)
    where theme_key = 'liquid-glass';
  else
    insert into public.theme_settings (
      theme_key,
      name,
      status,
      is_active,
      preview_image_url,
      hero_variant,
      product_card_variant,
      section_order,
      config,
      published_at
    )
    values (
      'liquid-glass',
      'Liquid Glass',
      'published',
      false,
      '',
      'liquid',
      'liquid-glass',
      theme_order,
      theme_config,
      now()
    );
  end if;
end $$;
