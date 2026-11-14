-- Sessões de curso no AgoraQuiz existente. Uma linha é uma tentativa e sua sessão.
begin;

alter table public.agoraquiz_tentativas
  alter column aula_id drop not null,
  add column curso_id uuid references public.cursos(id) on delete cascade,
  add constraint agoraquiz_tentativas_escopo check (num_nonnulls(aula_id, curso_id) = 1);

create index agoraquiz_tentativas_aluno_curso
  on public.agoraquiz_tentativas(usuario_id, curso_id, criado_em desc, id desc)
  where curso_id is not null;

alter table public.agoraquest_caderno
  alter column aula_id drop not null,
  add column curso_id uuid references public.cursos(id) on delete cascade,
  add constraint agoraquest_caderno_escopo check (num_nonnulls(aula_id, curso_id) = 1);

create index agoraquest_caderno_curso on public.agoraquest_caderno(curso_id)
  where curso_id is not null;

alter table public.agoraquest_caderno_eventos
  add column if not exists alternativa_correta text check (alternativa_correta in ('A','B','C','D'));

create function public.agoraquiz_gravar_curso(
  p_usuario uuid, p_curso uuid, p_id uuid, p_anterior uuid, p_revisao integer,
  p_operacao uuid, p_nova boolean, p_estado jsonb, p_erros jsonb
)
returns jsonb language plpgsql security invoker set search_path = '' set lock_timeout = '5s'
as $$
declare
  atual public.agoraquiz_tentativas%rowtype;
  ficha uuid;
  erro jsonb;
begin
  if p_usuario is null or p_curso is null or p_id is null or p_operacao is null
    or p_nova is null or p_revisao is null or p_revisao < 0
    or p_estado->>'id' is distinct from p_id::text
    or p_estado->>'origem' is distinct from 'agoraquiz'
    or coalesce(p_estado->>'modalidade','') not in ('estudo','simulado')
    or jsonb_typeof(p_erros) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Tentativa inválida.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'agoraquiz-curso:' || p_usuario::text || ':' || p_curso::text, 0));
  select * into atual from public.agoraquiz_tentativas
  where usuario_id = p_usuario and curso_id = p_curso
  order by criado_em desc, id desc limit 1 for update;

  if atual.id = p_id and atual.ultima_operacao = p_operacao then
    return to_jsonb(atual);
  end if;
  if atual.id is distinct from p_anterior or coalesce(atual.revisao, 0) <> p_revisao
    or (not p_nova and atual.id is distinct from p_id) then
    raise exception using errcode = '40001', message = 'A tentativa mudou em outra sessão.';
  end if;

  if p_nova then
    insert into public.agoraquiz_tentativas(id, usuario_id, curso_id, versao_conteudo, estado, ultima_operacao)
    values (p_id, p_usuario, p_curso, 1, p_estado, p_operacao) returning * into atual;
  else
    update public.agoraquiz_tentativas set estado = p_estado, ultima_operacao = p_operacao,
      revisao = revisao + 1, atualizado_em = now()
    where id = atual.id returning * into atual;
  end if;

  -- A confirmação e o registro de erro têm o mesmo commit.
  for erro in select value from jsonb_array_elements(p_erros) order by value->>'id' loop
    insert into public.agoraquest_caderno(usuario_id, questao_id, slug, numero, curso_id)
    values (p_usuario, erro->>'id', 'agoraquiz-hipercalemia', (erro->>'numero')::integer, p_curso)
    on conflict (usuario_id, questao_id) do nothing;
    select id into strict ficha from public.agoraquest_caderno
    where usuario_id = p_usuario and questao_id = erro->>'id' and curso_id = p_curso
    for update;
    insert into public.agoraquest_caderno_eventos
      (caderno_id, usuario_id, tentativa_id, tipo, escolha, correta, alternativa_correta)
    values (ficha, p_usuario, p_id, 'pratica', erro->>'escolha', false, erro->>'gabarito')
    on conflict (tentativa_id, caderno_id, tipo) do nothing;
    if found then
      update public.agoraquest_caderno set erros = erros + 1, acertos_seguidos = 0,
        estado = 'precisa_revisar', ultima_escolha = erro->>'escolha',
        ultimo_erro_em = now(), atualizado_em = now()
      where id = ficha;
    end if;
  end loop;
  return to_jsonb(atual);
end $$;

revoke all on function public.agoraquiz_gravar_curso(uuid,uuid,uuid,uuid,integer,uuid,boolean,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.agoraquiz_gravar_curso(uuid,uuid,uuid,uuid,integer,uuid,boolean,jsonb,jsonb)
  to service_role;

create function public.agoraquiz_revisar_caderno(
  p_usuario uuid, p_curso uuid, p_questao_id text, p_escolha text, p_gabarito text, p_operacao uuid
)
returns jsonb language plpgsql security invoker set search_path = '' set lock_timeout = '5s'
as $$
declare resultado jsonb;
begin
  if p_gabarito is null or p_gabarito not in ('A','B','C','D') then
    raise exception using errcode = '22023', message = 'Gabarito inválido.';
  end if;
  if not exists (select 1 from public.agoraquest_caderno
    where usuario_id = p_usuario and curso_id = p_curso and questao_id = p_questao_id) then
    raise exception using errcode = '42501', message = 'Questão indisponível.';
  end if;
  resultado := public.agoraquest_caderno_revisar(p_usuario, p_questao_id, p_escolha,
    p_escolha = p_gabarito, p_operacao, 2);
  update public.agoraquest_caderno_eventos set alternativa_correta = p_gabarito
  where operacao = p_operacao and usuario_id = p_usuario and caderno_id = (resultado->>'id')::uuid;
  return resultado;
end $$;

revoke all on function public.agoraquiz_revisar_caderno(uuid,uuid,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.agoraquiz_revisar_caderno(uuid,uuid,text,text,text,uuid)
  to service_role;
commit;
