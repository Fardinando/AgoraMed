-- Uma entrada por nova conta real. Recadastros não inserem em auth.users.
create table public.avisos_cadastro (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  ultima_tentativa_em timestamptz,
  enviado_em timestamptz,
  ultimo_erro text
);
alter table public.avisos_cadastro enable row level security;
revoke all on public.avisos_cadastro from anon, authenticated;
grant select, insert, update, delete on public.avisos_cadastro to service_role;
create index avisos_cadastro_pendentes_idx on public.avisos_cadastro (criado_em, usuario_id) where enviado_em is null;

create function public.enfileirar_aviso_cadastro()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and new.email <> '' then
    insert into public.avisos_cadastro (usuario_id) values (new.id)
    on conflict (usuario_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.enfileirar_aviso_cadastro() from public, anon, authenticated;
create trigger on_auth_user_cadastro_aviso
  after insert on auth.users
  for each row execute function public.enfileirar_aviso_cadastro();
