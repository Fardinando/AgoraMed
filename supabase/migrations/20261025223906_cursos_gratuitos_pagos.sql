-- Mudança aditiva: conserva UUIDs, matrículas, aulas, comentários e progresso.
alter table public.cursos
  add column tipo_acesso text not null default 'pago'
    constraint cursos_tipo_acesso_check check (tipo_acesso in ('gratis', 'pago')),
  add column url_vendas text not null default ''
    constraint cursos_url_vendas_check check (url_vendas = '' or url_vendas ~* '^https?://[^[:space:]]+$');

-- Somente contas futuras passam a dispensar aprovação manual.
-- Nenhuma conta anteriormente bloqueada é reativada.
alter table public.perfis alter column liberado set default true;

-- Curso identificado em leitura na produção e explicitamente indicado pelo professor.
do $$
begin
  if not exists (select 1 from public.cursos where id = '36c4246d-1f58-424b-ad07-c494ad7d4bd1' and titulo = 'DETERMINAÇÃO DE MORTE ENCEFÁLICA') then
    raise exception 'Curso de Determinação de Morte Encefálica não corresponde à referência conferida. Migração cancelada.';
  end if;
  update public.cursos set tipo_acesso = 'gratis'
  where id = '36c4246d-1f58-424b-ad07-c494ad7d4bd1';
end $$;

-- A consulta interna evita recursão entre RLS de cursos, perfis e matrículas.
-- Nunca recebe a identidade do usuário por argumento: usa o chamador autenticado.
create schema if not exists agoramed_privado;
revoke all on schema agoramed_privado from public, anon;
grant usage on schema agoramed_privado to authenticated;
create function agoramed_privado.pode_acessar_curso(curso uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis p join public.cursos c on c.id = curso
    where p.id = (select auth.uid()) and p.liberado
      and (p.papel = 'admin' or c.tipo_acesso = 'gratis' or exists (
        select 1 from public.matriculas m where m.usuario_id = p.id and m.curso_id = c.id
      ))
  )
$$;
revoke all on function agoramed_privado.pode_acessar_curso(uuid) from public, anon;
-- EXECUTE é necessário para avaliar as policies, sem expor o schema pela Data API.
grant execute on function agoramed_privado.pode_acessar_curso(uuid) to authenticated;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'admin' and liberado)
$$;

-- Mantém o nome usado pelas policies existentes, incluindo a gratuidade.
create or replace function public.matriculado(curso uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select agoramed_privado.pode_acessar_curso(curso)
$$;

create or replace function public.pode_ver_aula(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.aulas au join public.modulos m on m.id = au.modulo_id
    where au.id = a and agoramed_privado.pode_acessar_curso(m.curso_id)
  )
$$;
revoke all on function public.eh_admin() from public, anon;
revoke all on function public.matriculado(uuid) from public, anon;
revoke all on function public.pode_ver_aula(uuid) from public, anon;
grant execute on function public.eh_admin(), public.matriculado(uuid), public.pode_ver_aula(uuid) to authenticated, service_role;

alter policy "progresso ler" on public.progresso
  using (usuario_id = (select auth.uid()) and public.pode_ver_aula(aula_id));
alter policy "progresso gravar" on public.progresso
  with check (usuario_id = (select auth.uid()) and public.pode_ver_aula(aula_id));
alter policy "progresso apagar" on public.progresso
  using (usuario_id = (select auth.uid()) and public.pode_ver_aula(aula_id));
alter policy "comentarios apagar" on public.comentarios
  using (public.pode_ver_aula(aula_id) and (usuario_id = (select auth.uid()) or public.eh_admin()));

-- Triggers não são endpoints para visitantes/alunos.
revoke all on function public.novo_usuario(), public.bloquear_auto_promocao() from public, anon, authenticated;
-- RPC antiga não é mais usada pelo frontend/backend atual. Conservar a função,
-- mas impedir que um cliente público escolha livremente uma conta para excluir.
do $$
begin
  if to_regprocedure('public.excluir_usuario_completo(uuid)') is not null then
    revoke all on function public.excluir_usuario_completo(uuid) from public, anon, authenticated;
  end if;
end $$;
