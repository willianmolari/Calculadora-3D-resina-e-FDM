-- ============================================================
-- T&W 3D Maker — Banco de dados (Supabase / Postgres)
--
-- Como aplicar (em projeto novo):
--   1. Crie um projeto gratuito em https://supabase.com
--   2. SQL Editor → New query → cole este arquivo → Run
--   3. Crie os usuários em Authentication → Users → Add user
--      (ou use a tela "Usuários" do app, disponível para admins)
--   4. Marque o perfil do usuário como admin:
--      update public.profiles set role = 'admin'
--      where email = 'email@exemplo.com';
--   5. No app: Configurações → Banco de dados na nuvem → cole URL e chave
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- Dados da aplicação (um registro por workspace)
-- ------------------------------------------------------------
create table if not exists public.workspace (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace enable row level security;

-- ------------------------------------------------------------
-- Perfis: espelha auth.users com nome, papel e situação
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workspace to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Nenhum acesso anônimo: o app exige login.
revoke all on public.workspace from anon;
revoke all on public.profiles from anon;

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.active
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
  );
$$;

revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

-- ------------------------------------------------------------
-- Solicitações de exclusão de venda (segregação de funções)
-- O vendedor solicita; somente um admin aprova ou recusa.
-- ------------------------------------------------------------
create table if not exists public.sale_delete_requests (
  id text primary key,
  sale_id text not null,
  sale_product text,
  sale_client text,
  seller_id uuid not null references public.profiles(id),
  seller_name text,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_note text
);

create index if not exists sale_delete_requests_status_idx
  on public.sale_delete_requests(status, requested_at desc);

alter table public.sale_delete_requests enable row level security;

drop policy if exists "sellers read own delete requests" on public.sale_delete_requests;
create policy "sellers read own delete requests"
  on public.sale_delete_requests for select
  to authenticated
  using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "sellers create delete requests" on public.sale_delete_requests;
create policy "sellers create delete requests"
  on public.sale_delete_requests for insert
  to authenticated
  with check (
    public.is_active_user()
    and seller_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "admins review delete requests" on public.sale_delete_requests;
create policy "admins review delete requests"
  on public.sale_delete_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.sale_delete_requests to authenticated;
grant update on public.sale_delete_requests to authenticated;

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

-- ------------------------------------------------------------
-- Policies
-- ------------------------------------------------------------
drop policy if exists "workspace_anon_all" on public.workspace;
drop policy if exists "workspace_admin_all" on public.workspace;
drop policy if exists "workspace_active_all" on public.workspace;
create policy "workspace_active_all"
  on public.workspace
  for all
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

drop policy if exists "profile_read" on public.profiles;
drop policy if exists "profile_write" on public.profiles;
create policy "profile_read"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profile_write"
  on public.profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- CRUD de usuários (somente admins autenticados)
-- ------------------------------------------------------------
create or replace function public.admin_create_user(
  p_email text, p_password text, p_name text, p_role text default 'user'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
  v_role text := case when p_role in ('admin', 'user') then p_role else 'user' end;
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  if v_email is null or v_email = '' then raise exception 'Informe o e-mail.'; end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'A senha deve ter ao menos 8 caracteres.';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Já existe um usuário com este e-mail.';
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_sso_user, is_anonymous, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    reauthentication_token, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(p_name, '')),
    false, false, '', '', '', '', '', '', now(), now()
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_email,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, email, full_name, role, active)
  values (v_id, v_email, coalesce(p_name, ''), v_role, true);

  return v_id;
end;
$$;

create or replace function public.admin_update_user(
  p_id uuid, p_email text, p_name text, p_role text,
  p_active boolean, p_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_role text := case when p_role in ('admin', 'user') then p_role else 'user' end;
  v_old_role text;
  v_old_active boolean;
  v_admins int;
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;

  select role, active into v_old_role, v_old_active from public.profiles where id = p_id;
  if not found then raise exception 'Usuário não encontrado.'; end if;

  -- nunca remove o último admin ativo
  if (v_old_role = 'admin' and v_old_active) and (v_role <> 'admin' or not p_active) then
    select count(*) into v_admins from public.profiles where role = 'admin' and active;
    if v_admins <= 1 then raise exception 'Não é possível desativar o último administrador.'; end if;
  end if;

  if exists (select 1 from auth.users where email = v_email and id <> p_id) then
    raise exception 'Já existe um usuário com este e-mail.';
  end if;

  update auth.users
     set email = v_email,
         encrypted_password = case
           when p_password is null or p_password = '' then encrypted_password
           else crypt(p_password, gen_salt('bf')) end,
         raw_user_meta_data = jsonb_build_object('full_name', coalesce(p_name, '')),
         updated_at = now()
   where id = p_id;

  update auth.identities
     set provider_id = v_email,
         identity_data = jsonb_build_object('sub', p_id::text, 'email', v_email, 'email_verified', true),
         updated_at = now()
   where user_id = p_id and provider = 'email';

  update public.profiles
     set email = v_email, full_name = coalesce(p_name, ''),
         role = v_role, active = p_active
   where id = p_id;
end;
$$;

create or replace function public.admin_delete_user(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admins int;
  v_is_admin boolean;
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  if p_id = auth.uid() then raise exception 'Você não pode excluir a si mesmo.'; end if;

  select role = 'admin' into v_is_admin from public.profiles where id = p_id;
  if coalesce(v_is_admin, false) then
    select count(*) into v_admins from public.profiles where role = 'admin' and active;
    if v_admins <= 1 then raise exception 'Não é possível excluir o último administrador.'; end if;
  end if;

  delete from auth.users where id = p_id;
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid, email text, full_name text, role text,
  active boolean, created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  return query
    select u.id, u.email::text, coalesce(p.full_name, split_part(u.email, '@', 1)),
           coalesce(p.role, 'user'), coalesce(p.active, true),
           u.created_at, u.last_sign_in_at
      from auth.users u
      left join public.profiles p on p.id = u.id
     order by u.created_at;
end;
$$;

revoke all on function public.admin_create_user(text, text, text, text) from public;
revoke all on function public.admin_update_user(uuid, text, text, text, boolean, text) from public;
revoke all on function public.admin_delete_user(uuid) from public;
revoke all on function public.admin_list_users() from public;

grant execute on function public.admin_create_user(text, text, text, text) to authenticated;
grant execute on function public.admin_update_user(uuid, text, text, text, boolean, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
