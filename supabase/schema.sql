-- ============================================================
-- AGORAMED — esquema inicial (Postgres / Supabase)
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Banco nasce zerado: cursos e aulas são criados pelo painel.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------- perfis
-- Espelho de auth.users com os dados da plataforma.
-- A linha é criada automaticamente por trigger no signup.
create table if not exists public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  email     text not null default '',
  nome      text not null default '',
  whatsapp  text not null default '',
  papel     text not null default 'aluno' check (papel in ('admin', 'aluno')),
  liberado  boolean not null default false,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------- cursos
create table if not exists public.cursos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  subtitulo  text not null default '',
  categoria  text not null default '',
  nivel      text not null default 'Básico',
  descricao  text not null default '',
  capa_emoji text not null default '🩺',
  capa_url   text not null default '',
  criado_em  timestamptz not null default now(),
  criado_por uuid references public.perfis (id)
);

create table if not exists public.modulos (
  id       uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id) on delete cascade,
  titulo   text not null,
  ordem    integer not null default 0
);

create table if not exists public.aulas (
  id         uuid primary key default gen_random_uuid(),
  modulo_id  uuid not null references public.modulos (id) on delete cascade,
  titulo     text not null,
  ordem      integer not null default 0,
  descricao  text not null default '',
  youtube_id text not null default '',
  duracao    text not null default ''
);

-- materiais em PDF: o arquivo fica no Supabase Storage,
-- aqui guardamos só o caminho
create table if not exists public.materiais (
  id        uuid primary key default gen_random_uuid(),
  aula_id   uuid not null references public.aulas (id) on delete cascade,
  nome      text not null,
  caminho   text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------- acesso
-- admin "libera" o aluno e dá acesso aos cursos
create table if not exists public.matriculas (
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  curso_id   uuid not null references public.cursos (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (usuario_id, curso_id)
);

create table if not exists public.progresso (
  usuario_id   uuid not null references public.perfis (id) on delete cascade,
  aula_id      uuid not null references public.aulas (id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (usuario_id, aula_id)
);

create table if not exists public.comentarios (
  id         uuid primary key default gen_random_uuid(),
  aula_id    uuid not null references public.aulas (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  texto      text not null,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------- divulgações
create table if not exists public.promos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  texto      text not null default '',
  link       text not null default '',
  imagem_url text not null default '',
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------- índices
create index if not exists idx_modulos_curso on public.modulos (curso_id, ordem);
create index if not exists idx_aulas_modulo  on public.aulas (modulo_id, ordem);
create index if not exists idx_materiais_aula on public.materiais (aula_id);
create index if not exists idx_comentarios_aula on public.comentarios (aula_id, criado_em);
create index if not exists idx_matriculas_curso on public.matriculas (curso_id);
create index if not exists idx_matriculas_usuario on public.matriculas (usuario_id);
create index if not exists idx_progresso_usuario on public.progresso (usuario_id);
create index if not exists idx_cursos_criado_em on public.cursos (criado_em);
create index if not exists idx_promos_ativo_ordem on public.promos (ativo, ordem);
create index if not exists idx_perfis_criado_em on public.perfis (criado_em);

-- ============================================================
-- Funções auxiliares para a RLS (security definer: consultam
-- perfis sem depender das policies de leitura dela mesma)
-- ============================================================

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from perfis where id = auth.uid() and papel = 'admin') $$;

create or replace function public.matriculado(curso uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from matriculas
    where usuario_id = auth.uid() and curso_id = curso
  )
$$;

create or replace function public.pode_ver_aula(a uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.eh_admin() or exists (
    select 1
      from aulas au
      join modulos m on m.id = au.modulo_id
      join matriculas mt on mt.curso_id = m.curso_id
     where au.id = a and mt.usuario_id = auth.uid()
  )
$$;

-- ============================================================
-- Trigger: cria o perfil quando o usuário se cadastra
-- (nome e whatsapp vêm nos metadados do signUp)
-- ============================================================

create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.perfis (id, nome, whatsapp, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.novo_usuario();

-- ============================================================
-- Proteção extra: só admin altera papel/liberado de alguém
-- (impede que o próprio aluno se promova ou se libere).
-- O SQL Editor (postgres) e o servidor (service_role) passam livre.
-- ============================================================

create or replace function public.bloquear_auto_promocao()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (tg_op = 'UPDATE'
      and (new.papel is distinct from old.papel
           or new.liberado is distinct from old.liberado)
      and not (public.eh_admin()
               or coalesce(auth.role(), 'postgres') in ('postgres', 'service_role'))) then
    raise exception 'Somente o professor altera papel ou liberação de contas.';
  end if;
  return new;
end $$;

drop trigger if exists trg_bloquear_auto_promocao on public.perfis;
create trigger trg_bloquear_auto_promocao
  before update on public.perfis
  for each row execute function public.bloquear_auto_promocao();

-- ============================================================
-- RLS — habilita e cria as policies
-- ============================================================

alter table public.perfis     enable row level security;
alter table public.cursos     enable row level security;
alter table public.modulos    enable row level security;
alter table public.aulas      enable row level security;
alter table public.materiais  enable row level security;
alter table public.matriculas enable row level security;
alter table public.progresso  enable row level security;
alter table public.comentarios enable row level security;
alter table public.promos     enable row level security;

-- perfis
drop policy if exists "perfis ler" on public.perfis;
create policy "perfis ler" on public.perfis for select
  to authenticated
  using (id = auth.uid() or public.eh_admin());

drop policy if exists "perfis editar proprio" on public.perfis;
create policy "perfis editar proprio" on public.perfis for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "perfis admin edita" on public.perfis;
create policy "perfis admin edita" on public.perfis for update
  to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "perfis admin insere" on public.perfis;
create policy "perfis admin insere" on public.perfis for insert
  to authenticated
  with check (public.eh_admin());

drop policy if exists "perfis admin remove" on public.perfis;
create policy "perfis admin remove" on public.perfis for delete
  to authenticated
  using (public.eh_admin());

-- cursos
drop policy if exists "cursos ler" on public.cursos;
create policy "cursos ler" on public.cursos for select
  to authenticated
  using (public.eh_admin() or public.matriculado(id));

drop policy if exists "cursos admin escreve" on public.cursos;
create policy "cursos admin escreve" on public.cursos for all
  to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- módulos
drop policy if exists "modulos ler" on public.modulos;
create policy "modulos ler" on public.modulos for select
  to authenticated
  using (public.eh_admin() or public.matriculado(curso_id));

drop policy if exists "modulos admin escreve" on public.modulos;
create policy "modulos admin escreve" on public.modulos for all
  to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- aulas
drop policy if exists "aulas ler" on public.aulas;
create policy "aulas ler" on public.aulas for select
  to authenticated
  using (public.pode_ver_aula(id));

drop policy if exists "aulas admin escreve" on public.aulas;
create policy "aulas admin escreve" on public.aulas for all
  to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- materiais (PDFs)
drop policy if exists "materiais ler" on public.materiais;
create policy "materiais ler" on public.materiais for select
  to authenticated
  using (public.pode_ver_aula(aula_id));

drop policy if exists "materiais admin escreve" on public.materiais;
create policy "materiais admin escreve" on public.materiais for all
  to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- matriculas (admin concede acesso)
drop policy if exists "matriculas ler" on public.matriculas;
create policy "matriculas ler" on public.matriculas for select
  to authenticated
  using (usuario_id = auth.uid() or public.eh_admin());

drop policy if exists "matriculas admin escreve" on public.matriculas;
create policy "matriculas admin escreve" on public.matriculas for all
  to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- progresso (cada um no seu)
drop policy if exists "progresso ler" on public.progresso;
create policy "progresso ler" on public.progresso for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "progresso gravar" on public.progresso;
create policy "progresso gravar" on public.progresso for insert
  to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists "progresso apagar" on public.progresso;
create policy "progresso apagar" on public.progresso for delete
  to authenticated
  using (usuario_id = auth.uid());

-- comentários (quem pode ver a aula pode comentar/ler)
drop policy if exists "comentarios ler" on public.comentarios;
create policy "comentarios ler" on public.comentarios for select
  to authenticated
  using (public.pode_ver_aula(aula_id));

drop policy if exists "comentarios criar" on public.comentarios;
create policy "comentarios criar" on public.comentarios for insert
  to authenticated
  with check (usuario_id = auth.uid() and public.pode_ver_aula(aula_id));

drop policy if exists "comentarios apagar" on public.comentarios;
create policy "comentarios apagar" on public.comentarios for delete
  to authenticated
  using (usuario_id = auth.uid() or public.eh_admin());

-- divulgações
drop policy if exists "promos ler" on public.promos;
create policy "promos ler" on public.promos for select
  to authenticated
  using (true);

drop policy if exists "promos admin escreve" on public.promos;
create policy "promos admin escreve" on public.promos for all
  to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- ============================================================
-- Storage — buckets (materiais privado, capas público)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('materiais', 'materiais', false), ('capas', 'capas', true)
on conflict (id) do nothing;

-- leitura dos PDFs: o caminho é "aula_id/arquivo.pdf"
drop policy if exists "materiais ler storage" on storage.objects;
create policy "materiais ler storage" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'materiais'
    and (
      public.eh_admin()
      or (
        (storage.foldername(name))[1] is not null
        and public.pode_ver_aula((storage.foldername(name))[1]::uuid)
      )
    )
  );

drop policy if exists "materiais admin grava" on storage.objects;
create policy "materiais admin grava" on storage.objects for all
  to authenticated
  using (bucket_id = 'materiais' and public.eh_admin())
  with check (bucket_id = 'materiais' and public.eh_admin());

drop policy if exists "capas admin grava" on storage.objects;
create policy "capas admin grava" on storage.objects for all
  to authenticated
  using (bucket_id = 'capas' and public.eh_admin())
  with check (bucket_id = 'capas' and public.eh_admin());
