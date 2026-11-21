-- ============================================================
-- Molari 3D — Banco de dados gratuito (Supabase / Postgres)
-- Como usar:
--   1. Crie um projeto gratuito em https://supabase.com
--   2. Aba o SQL Editor (esquerda) → New query
--   3. Cole todo este arquivo e clique em "Run"
--   4. Em Project Settings → API, copie a "Project URL" e a "anon public key"
--   5. Cole as duas informações em Configurações → Banco de dados na nuvem
-- ============================================================

create table if not exists public.workspace (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace enable row level security;

-- Permissões explícitas (necessárias em projetos novos do Supabase)
grant usage on schema public to anon;
grant select, insert, update, delete on public.workspace to anon;

-- A política abaixo permite o app usar a chave anon (pública) sem login.
-- Adequada para uso pessoal. Se quiser restringir, troque "to anon" por
-- "to authenticated" e configure Supabase Auth no app.
drop policy if exists "workspace_anon_all" on public.workspace;
create policy "workspace_anon_all"
  on public.workspace
  for all
  to anon
  using (true)
  with check (true);

-- Mantém updated_at atualizado automaticamente
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workspace_touch on public.workspace;
create trigger workspace_touch
  before update on public.workspace
  for each row execute function public.touch_updated_at();
