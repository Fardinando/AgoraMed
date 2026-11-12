-- AgoraQuest: atividade de prática por aula, com correção no servidor.
-- O conteúdo das questões permanece no código (lib/agoraquest); o banco guarda
-- apenas o vínculo da aula com a atividade e as tentativas do aluno.
alter table public.aulas add column if not exists atividade text;

create table if not exists public.agoraquest_atividades (
  slug             text primary key,
  aula_id          uuid not null unique references public.aulas(id) on delete cascade,
  versao_conteudo  integer not null check (versao_conteudo > 0),
  titulo           text not null default '',
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists agoraquest_atividades_aula on public.agoraquest_atividades(aula_id);
alter table public.agoraquest_atividades enable row level security;
revoke all on public.agoraquest_atividades from public, anon, authenticated;
grant select, insert, update, delete on public.agoraquest_atividades to service_role;

create table if not exists public.agoraquest_tentativas (
  id               uuid primary key,
  usuario_id       uuid not null references public.perfis(id) on delete cascade,
  aula_id          uuid not null references public.aulas(id) on delete cascade,
  versao_conteudo  integer not null check (versao_conteudo > 0),
  revisao          integer not null default 1 check (revisao > 0),
  estado           jsonb not null check (jsonb_typeof(estado) = 'object'),
  ultima_operacao  uuid not null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists agoraquest_tentativas_aluno_aula on public.agoraquest_tentativas(usuario_id, aula_id, criado_em desc, id desc);
create index if not exists agoraquest_tentativas_aula on public.agoraquest_tentativas(aula_id);
alter table public.agoraquest_tentativas enable row level security;
revoke all on public.agoraquest_tentativas from public, anon, authenticated;
grant select, insert, update, delete on public.agoraquest_tentativas to service_role;

create or replace function public.agoraquest_gravar(
  p_usuario uuid, p_aula uuid, p_id uuid, p_revisao integer, p_estado jsonb,
  p_nova boolean, p_anterior uuid, p_operacao uuid, p_versao integer
)
returns jsonb language plpgsql security invoker set search_path = '' set lock_timeout = '5s' as $$
declare
  atual public.agoraquest_tentativas%rowtype;
  ultima uuid;
  respostas jsonb;
  v_slug text;
  v_versao integer;
begin
  if p_usuario is null or p_aula is null or p_id is null or p_operacao is null or p_versao is null or p_versao < 1
     or p_estado is null or jsonb_typeof(p_estado) is distinct from 'object'
     or jsonb_typeof(p_estado->'answers') is distinct from 'array'
     or p_estado->>'id' is distinct from p_id::text
     or p_estado->>'version' is distinct from '1' then
    raise exception using errcode = '22023', message = 'Tentativa inválida.';
  end if;

  select a.slug, a.versao_conteudo into v_slug, v_versao
  from public.agoraquest_atividades a where a.aula_id = p_aula;
  if v_slug is null then
    raise exception using errcode = '42501', message = 'Atividade indisponível.';
  end if;
  if p_versao <> v_versao then
    raise exception using errcode = '22023', message = 'Versão da atividade inválida.';
  end if;

  if not exists (select 1 from public.perfis where id = p_usuario and liberado)
     or not exists (
       select 1 from public.aulas a
       join public.modulos m on m.id = a.modulo_id
       join public.cursos c on c.id = m.curso_id
       where a.id = p_aula
         and (c.tipo_acesso = 'gratis'
           or exists (select 1 from public.perfis where id = p_usuario and papel = 'admin')
           or exists (select 1 from public.matriculas where usuario_id = p_usuario and curso_id=c.id and (expira_em is null or expira_em>now())))
     ) then
    raise exception using errcode = '42501', message = 'Sem acesso à atividade.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('agoraquest:' || p_usuario::text || ':' || p_aula::text, 0));
  select * into atual from public.agoraquest_tentativas
  where id = p_id and usuario_id = p_usuario and aula_id = p_aula for update;
  if found and atual.ultima_operacao = p_operacao then return to_jsonb(atual); end if;

  select id into ultima from public.agoraquest_tentativas
  where usuario_id = p_usuario and aula_id = p_aula
  order by criado_em desc, id desc limit 1;

  if p_nova then
    if atual.id is not null or ultima is distinct from p_anterior then
      raise exception using errcode = '40001', message = 'A atividade mudou em outra sessão. Atualize para retomar.';
    end if;
    if p_estado->'answers' is distinct from '[]'::jsonb or p_estado->>'finishedAt' is not null then
      raise exception using errcode = '22023', message = 'Nova tentativa inválida.';
    end if;
    insert into public.agoraquest_tentativas(id, usuario_id, aula_id, versao_conteudo, estado, ultima_operacao)
    values (p_id, p_usuario, p_aula, p_versao, p_estado, p_operacao)
    returning * into atual;
  else
    if atual.id is null or ultima is distinct from p_id or atual.revisao <> p_revisao or atual.versao_conteudo <> p_versao then
      raise exception using errcode = '40001', message = 'A atividade mudou em outra sessão. Atualize para retomar.';
    end if;
    update public.agoraquest_tentativas
    set estado = p_estado, revisao = revisao + 1, ultima_operacao = p_operacao, atualizado_em = now()
    where id = p_id returning * into atual;
  end if;

  if atual.estado->>'finishedAt' is not null then
    respostas := atual.estado->'answers';
    if jsonb_array_length(respostas) <> 5
       or exists (select 1 from jsonb_array_elements(respostas) a where a->>'seen' is distinct from 'true') then
      raise exception using errcode = '22023', message = 'Conclua as cinco questões antes de ver o resultado.';
    end if;
  end if;

  return to_jsonb(atual);
end $$;
revoke all on function public.agoraquest_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.agoraquest_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer) to service_role;

-- Vincula a atividade à Aula 01 do Módulo 1 do curso de Hipercalemia.
-- O UUID do curso é conferido por título/ordem para não depender de IDs copiados.
do $$
declare
  v_curso uuid;
  v_titulo_curso text;
  v_aula uuid;
  v_titulo_aula text;
begin
  select c.id, c.titulo into v_curso, v_titulo_curso
  from public.cursos c
  where c.id = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983'
     or c.titulo ilike '%hipercalemia%'
  order by (c.id = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983') desc, c.criado_em asc
  limit 1;

  if v_curso is null then
    raise notice 'AgoraQuest: curso de Hipercalemia não encontrado; vínculo não criado.';
    return;
  end if;

  -- Aula 01 do Módulo 1: primeira aula, na ordem, do primeiro módulo do curso.
  select a.id, a.titulo into v_aula, v_titulo_aula
  from public.aulas a
  join public.modulos m on m.id = a.modulo_id
  where m.curso_id = v_curso
  order by m.ordem asc, m.id asc, a.ordem asc, a.id asc
  limit 1;

  if v_aula is null then
    raise notice 'AgoraQuest: nenhuma aula elegível em %; vínculo não criado.', v_titulo_curso;
    return;
  end if;

  delete from public.agoraquest_atividades
  where slug = 'hipercalemia-aula-01-v1' and aula_id <> v_aula;
  delete from public.agoraquest_atividades
  where aula_id = v_aula and slug <> 'hipercalemia-aula-01-v1';

  insert into public.agoraquest_atividades(slug, aula_id, versao_conteudo, titulo)
  values ('hipercalemia-aula-01-v1', v_aula, 1, 'Hipercalemia — Aula 01')
  on conflict (slug) do update
    set aula_id = excluded.aula_id,
        versao_conteudo = excluded.versao_conteudo,
        titulo = excluded.titulo,
        atualizado_em = now();

  raise notice 'AgoraQuest vinculado ao curso "%" e à aula "%" (%).', v_titulo_curso, v_titulo_aula, v_aula;
end $$;

notify pgrst, 'reload schema';
