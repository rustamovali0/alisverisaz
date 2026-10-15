BEGIN;

-- Preserve the installed checkout implementation, changing only stock checks.
DO $$
DECLARE definition text; target oid;
BEGIN
  SELECT p.oid INTO STRICT target FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='create_atomic_checkout_orders'
    AND p.pronargs=10;
  definition := pg_get_functiondef(target);
  IF position('stock_tracking_enabled' in definition) = 0 THEN
    IF position('products.stock_quantity,' in definition) = 0 OR
       position('where stock_quantity < quantity' in definition) = 0 OR
       position('where products.id = checkout_products.id;' in definition) = 0 THEN
      RAISE EXCEPTION 'Checkout differs from expected version; review before migration';
    END IF;
    definition := replace(definition, 'products.stock_quantity,',
      'products.stock_quantity, coalesce(products.metadata->>''stockTrackingEnabled'', ''true'') <> ''false'' as stock_tracking_enabled,');
    definition := replace(definition, 'where stock_quantity < quantity',
      'where stock_tracking_enabled and stock_quantity < quantity');
    definition := replace(definition, 'where products.id = checkout_products.id;',
      'where products.id = checkout_products.id and checkout_products.stock_tracking_enabled;');
    EXECUTE definition;
  END IF;
END $$;

-- Cost snapshots are seller-only, never part of customer order item responses.
CREATE TABLE IF NOT EXISTS public.seller_profit_items (
  order_item_id uuid PRIMARY KEY REFERENCES public.order_items(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  unit_cost numeric(12,2) NOT NULL CHECK (unit_cost >= 0)
);
ALTER TABLE public.seller_profit_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_profit_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.seller_profit_items TO service_role;
CREATE INDEX IF NOT EXISTS seller_profit_items_store_idx ON public.seller_profit_items(store_id);

CREATE OR REPLACE FUNCTION public.capture_seller_profit_cost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.seller_profit_items(order_item_id, order_id, store_id, unit_cost)
  SELECT NEW.id, NEW.order_id, p.store_id, p.cost_amount
  FROM public.products p JOIN public.stores s ON s.id=p.store_id
  WHERE p.id=NEW.product_id AND s.settings->>'profitTrackingEnabled'='true'
    AND p.cost_amount IS NOT NULL
  ON CONFLICT (order_item_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_seller_profit_cost() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS capture_seller_profit_cost ON public.order_items;
CREATE TRIGGER capture_seller_profit_cost AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.capture_seller_profit_cost();
NOTIFY pgrst, 'reload schema';
COMMIT;
