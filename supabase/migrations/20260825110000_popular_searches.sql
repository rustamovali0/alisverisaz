create table if not exists public.marketplace_search_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(term) between 2 and 120),
  normalized_term text not null check (char_length(normalized_term) between 2 and 120),
  search_count integer not null default 0 check (search_count >= 0),
  last_searched_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists marketplace_search_terms_normalized_term_key
  on public.marketplace_search_terms (normalized_term);

create index if not exists marketplace_search_terms_popularity_idx
  on public.marketplace_search_terms (search_count desc, last_searched_at desc);

alter table public.marketplace_search_terms enable row level security;

create or replace function public.record_marketplace_search(search_term text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_term text;
  normalized_value text;
begin
  cleaned_term := btrim(regexp_replace(coalesce(search_term, ''), '[[:space:]]+', ' ', 'g'));
  normalized_value := lower(cleaned_term);

  if char_length(cleaned_term) < 2 or char_length(cleaned_term) > 120 then
    return;
  end if;

  insert into public.marketplace_search_terms (
    term,
    normalized_term,
    search_count,
    last_searched_at
  )
  values (
    cleaned_term,
    normalized_value,
    1,
    timezone('utc', now())
  )
  on conflict (normalized_term) do update
    set term = excluded.term,
        search_count = public.marketplace_search_terms.search_count + 1,
        last_searched_at = excluded.last_searched_at;
end;
$$;

revoke all on function public.record_marketplace_search(text) from public;
grant execute on function public.record_marketplace_search(text) to service_role;
