create policy "categories_select_active_public"
on public.categories for select
using (is_active);

create policy "products_select_active_public"
on public.products for select
using (status = 'active');

create policy "product_images_select_active_product_public"
on public.product_images for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.status = 'active'
  )
);

create policy "product_variants_select_active_product_public"
on public.product_variants for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and p.status = 'active'
  )
);
