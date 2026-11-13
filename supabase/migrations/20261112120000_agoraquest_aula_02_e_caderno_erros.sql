-- AgoraQuest Aula 02 + Caderno de Erros.
-- Aditivo: cria o caderno consolidado por aluno/questão, o histórico de eventos,
-- as RPCs de sincronização/revisão e vincula a Aula 02 do curso de Hipercalemia.
-- Não altera tentativas, aulas, matrículas, progresso ou o conteúdo da Aula 01.

/* ------------------------------------------------------------ caderno */
create table if not exists public.agoraquest_caderno (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references public.perfis(id) on delete cascade,
  questao_id       text not null,
  slug             text not null,
  numero           integer not null check (numero > 0),
  aula_id          uuid not null references public.aulas(id) on delete cascade,
  estado           text not null default 'precisa_revisar'
                   check (estado in ('precisa_revisar','em_revisao','dominada')),
  erros            integer not null default 0 check (erros >= 0),
  revisoes         integer not null default 0 check (revisoes >= 0),
  acertos_seguidos integer not null default 0 check (acertos_seguidos >= 0),
  ultima_escolha   text check (ultima_escolha is null or ultima_escolha in ('A','B','C','D')),
  ultimo_erro_em   timestamptz,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (usuario_id, questao_id)
);
create index if not exists agoraquest_caderno_aluno on public.agoraquest_caderno(usuario_id, estado, atualizado_em desc);
create index if not exists agoraquest_caderno_aula on public.agoraquest_caderno(aula_id);
alter table public.agoraquest_caderno enable row level security;
revoke all on public.agoraquest_caderno from public, anon, authenticated;
grant select, insert, update, delete on public.agoraquest_caderno to service_role;

create table if not exists public.agoraquest_caderno_eventos (
  id           uuid primary key default gen_random_uuid(),
  caderno_id   uuid not null references public.agoraquest_caderno(id) on delete cascade,
  usuario_id   uuid not null references public.perfis(id) on delete cascade,
  tentativa_id uuid,
  operacao     uuid,
  tipo         text not null check (tipo in ('pratica','revisao')),
  escolha      text not null check (escolha in ('A','B','C','D')),
  correta      boolean not null,
  criado_em    timestamptz not null default now(),
  unique (tentativa_id, caderno_id, tipo),
  unique (operacao)
);
create index if not exists agoraquest_caderno_eventos_aluno on public.agoraquest_caderno_eventos(usuario_id, criado_em desc);
create index if not exists agoraquest_caderno_eventos_item on public.agoraquest_caderno_eventos(caderno_id, criado_em desc);
alter table public.agoraquest_caderno_eventos enable row level security;
revoke all on public.agoraquest_caderno_eventos from public, anon, authenticated;
grant select, insert, update, delete on public.agoraquest_caderno_eventos to service_role;

/* ----------------------------------------------------- sincronização
   Chamada pelo servidor depois de gravar uma tentativa. p_erros é uma lista de
   {tentativa, numero, escolha, em} já conferida contra o gabarito no Node.
   É idempotente: o mesmo erro da mesma tentativa não conta duas vezes. */
create or replace function public.agoraquest_caderno_sincronizar(
  p_usuario uuid, p_aula uuid, p_slug text, p_erros jsonb
)
returns integer language plpgsql security invoker set search_path = '' set lock_timeout = '5s' as $$
declare
  item jsonb;
  v_id uuid;
  v_revisoes integer;
  v_numero integer;
  v_escolha text;
  v_tentativa uuid;
  v_em timestamptz;
  v_total integer := 0;
begin
  if p_usuario is null or p_aula is null or p_slug is null
     or p_erros is null or jsonb_typeof(p_erros) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Sincronização inválida.';
  end if;
  if not exists (select 1 from public.agoraquest_atividades where slug = p_slug and aula_id = p_aula) then
    raise exception using errcode = '42501', message = 'Atividade indisponível.';
  end if;
  if not exists (select 1 from public.perfis where id = p_usuario and liberado) then
    raise exception using errcode = '42501', message = 'Sem acesso ao caderno.';
  end if;

  for item in select value from jsonb_array_elements(p_erros) loop
    v_numero := nullif(item->>'numero','')::integer;
    v_escolha := item->>'escolha';
    v_tentativa := nullif(item->>'tentativa','')::uuid;
    v_em := coalesce(nullif(item->>'em','')::timestamptz, now());
    if v_numero is null or v_numero < 1 or v_tentativa is null
       or v_escolha is null or v_escolha not in ('A','B','C','D') then
      continue;
    end if;

    insert into public.agoraquest_caderno(usuario_id, questao_id, slug, numero, aula_id, ultima_escolha, ultimo_erro_em)
    values (p_usuario, p_slug || '#' || v_numero, p_slug, v_numero, p_aula, v_escolha, v_em)
    on conflict (usuario_id, questao_id) do nothing;

    select id, revisoes into v_id, v_revisoes
    from public.agoraquest_caderno
    where usuario_id = p_usuario and questao_id = p_slug || '#' || v_numero
    for update;

    insert into public.agoraquest_caderno_eventos(caderno_id, usuario_id, tentativa_id, tipo, escolha, correta)
    values (v_id, p_usuario, v_tentativa, 'pratica', v_escolha, false)
    on conflict (tentativa_id, caderno_id, tipo) do nothing;

    if found then
      update public.agoraquest_caderno
      set erros = erros + 1,
          acertos_seguidos = 0,
          estado = case when v_revisoes > 0 then 'em_revisao' else 'precisa_revisar' end,
          ultima_escolha = v_escolha,
          ultimo_erro_em = v_em,
          atualizado_em = now()
      where id = v_id;
      v_total := v_total + 1;
    end if;
  end loop;

  return v_total;
end $$;
revoke all on function public.agoraquest_caderno_sincronizar(uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.agoraquest_caderno_sincronizar(uuid,uuid,text,jsonb) to service_role;

/* --------------------------------------------------------- revisão
   p_correta é calculada no servidor a partir do conteúdo versionado.
   p_dominio é configurável (padrão 2 acertos consecutivos). */
create or replace function public.agoraquest_caderno_revisar(
  p_usuario uuid, p_questao_id text, p_escolha text, p_correta boolean,
  p_operacao uuid, p_dominio integer default 2
)
returns jsonb language plpgsql security invoker set search_path = '' set lock_timeout = '5s' as $$
declare
  v_row public.agoraquest_caderno%rowtype;
  v_acertos integer;
  v_estado text;
  v_dominio integer;
begin
  if p_usuario is null or p_questao_id is null or p_operacao is null
     or p_escolha is null or p_escolha not in ('A','B','C','D')
     or p_correta is null then
    raise exception using errcode = '22023', message = 'Revisão inválida.';
  end if;

  /* O lock serializa duas abas com a mesma questão e torna a operação idempotente. */
  select * into v_row from public.agoraquest_caderno
  where usuario_id = p_usuario and questao_id = p_questao_id
  for update;
  if v_row.id is null then
    raise exception using errcode = '42501', message = 'Questão não está no seu caderno.';
  end if;

  if exists (select 1 from public.agoraquest_caderno_eventos where operacao = p_operacao and usuario_id = p_usuario) then
    return to_jsonb(v_row);
  end if;

  v_dominio := greatest(coalesce(p_dominio, 2), 1);
  v_acertos := case when p_correta then v_row.acertos_seguidos + 1 else 0 end;
  v_estado := case when p_correta and v_acertos >= v_dominio then 'dominada' else 'em_revisao' end;

  update public.agoraquest_caderno
  set revisoes = revisoes + 1,
      acertos_seguidos = v_acertos,
      estado = v_estado,
      erros = case when p_correta then erros else erros + 1 end,
      ultima_escolha = p_escolha,
      ultimo_erro_em = case when p_correta then ultimo_erro_em else now() end,
      atualizado_em = now()
  where id = v_row.id
  returning * into v_row;

  insert into public.agoraquest_caderno_eventos(caderno_id, usuario_id, operacao, tipo, escolha, correta)
  values (v_row.id, p_usuario, p_operacao, 'revisao', p_escolha, p_correta);

  return to_jsonb(v_row);
end $$;
revoke all on function public.agoraquest_caderno_revisar(uuid,text,text,boolean,uuid,integer) from public, anon, authenticated;
grant execute on function public.agoraquest_caderno_revisar(uuid,text,text,boolean,uuid,integer) to service_role;

/* --------------------------------------------------------- Aula 02
   Localiza o curso de Hipercalemia e a aula "A fisiologia do potássio que muda
   a conduta". Se o título não existir, usa a segunda aula na ordem do curso.
   Nunca reaproveita uma aula que já tenha outra atividade do AgoraQuest. */
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
    raise notice 'AgoraQuest: curso de Hipercalemia não encontrado; Aula 02 não vinculada.';
    return;
  end if;

  select a.id, a.titulo into v_aula, v_titulo_aula
  from public.aulas a
  join public.modulos m on m.id = a.modulo_id
  where m.curso_id = v_curso
    and a.titulo ilike '%fisiologia do potássio%'
  order by m.ordem asc, m.id asc, a.ordem asc, a.id asc
  limit 1;

  if v_aula is null then
    select id, titulo into v_aula, v_titulo_aula
    from (
      select a.id, a.titulo,
             row_number() over (order by m.ordem asc, m.id asc, a.ordem asc, a.id asc) as posicao
      from public.aulas a
      join public.modulos m on m.id = a.modulo_id
      where m.curso_id = v_curso
    ) ordenadas
    where posicao = 2;
  end if;

  if v_aula is null then
    raise notice 'AgoraQuest: segunda aula não encontrada em %; Aula 02 não vinculada.', v_titulo_curso;
    return;
  end if;

  if exists (select 1 from public.agoraquest_atividades
             where aula_id = v_aula and slug <> 'hipercalemia-aula-02-v1') then
    raise notice 'AgoraQuest: a aula "%" já possui outra atividade; Aula 02 não vinculada.', v_titulo_aula;
    return;
  end if;

  delete from public.agoraquest_atividades
  where slug = 'hipercalemia-aula-02-v1' and aula_id <> v_aula;
  delete from public.agoraquest_atividades
  where aula_id = v_aula and slug <> 'hipercalemia-aula-02-v1';

  insert into public.agoraquest_atividades(slug, aula_id, versao_conteudo, titulo)
  values ('hipercalemia-aula-02-v1', v_aula, 1, 'Hipercalemia — Aula 02')
  on conflict (slug) do update
    set aula_id = excluded.aula_id,
        versao_conteudo = excluded.versao_conteudo,
        titulo = excluded.titulo,
        atualizado_em = now();

  raise notice 'AgoraQuest Aula 02 vinculado ao curso "%" e à aula "%" (%).', v_titulo_curso, v_titulo_aula, v_aula;
end $$;

notify pgrst, 'reload schema';
