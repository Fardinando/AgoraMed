-- AgoraQuiz: o servidor autoriza e corrige; escrita restrita à service_role.
alter table public.aulas add column atividade text;
create table public.agoraquiz_tentativas (
 id uuid primary key,
 usuario_id uuid not null references public.perfis(id) on delete cascade,
 aula_id uuid not null references public.aulas(id) on delete cascade,
 versao_conteudo integer not null check(versao_conteudo>0),
 revisao integer not null default 1 check(revisao>0),
 estado jsonb not null check(jsonb_typeof(estado)='object'),
 ultima_operacao uuid not null,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create index agoraquiz_tentativas_aluno_aula on public.agoraquiz_tentativas(usuario_id,aula_id,criado_em desc,id desc);
create index agoraquiz_tentativas_aula on public.agoraquiz_tentativas(aula_id);
alter table public.agoraquiz_tentativas enable row level security;
revoke all on public.agoraquiz_tentativas from public,anon,authenticated;
grant select,insert,update,delete on public.agoraquiz_tentativas to service_role;

create function public.agoraquiz_gravar(p_usuario uuid,p_aula uuid,p_id uuid,p_revisao integer,p_estado jsonb,p_nova boolean,p_anterior uuid,p_operacao uuid,p_versao integer)
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='5s' as $$
declare atual public.agoraquiz_tentativas%rowtype; ultima uuid; respostas jsonb;
begin
 if p_usuario is null or p_aula is null or p_id is null or p_operacao is null or p_versao<>1 or p_estado->>'id' is distinct from p_id::text or p_estado->>'version' is distinct from '1' then
   raise exception using errcode='22023',message='Tentativa inválida.';
 end if;
 if not exists(select 1 from public.perfis where id=p_usuario and liberado) or not exists(select 1 from public.aulas a join public.modulos m on m.id=a.modulo_id join public.cursos c on c.id=m.curso_id where a.id=p_aula and a.atividade='pre-requisitos-v1' and (c.tipo_acesso='gratis' or exists(select 1 from public.perfis where id=p_usuario and papel='admin') or exists(select 1 from public.matriculas where usuario_id=p_usuario and curso_id=c.id))) then
   raise exception using errcode='42501',message='Sem acesso à atividade.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('quiz:'||p_usuario::text||':'||p_aula::text,0));
 select * into atual from public.agoraquiz_tentativas where id=p_id and usuario_id=p_usuario and aula_id=p_aula for update;
 if found and atual.ultima_operacao=p_operacao then return to_jsonb(atual); end if;
 select id into ultima from public.agoraquiz_tentativas where usuario_id=p_usuario and aula_id=p_aula order by criado_em desc,id desc limit 1;
 if p_nova then
   if atual.id is not null or ultima is distinct from p_anterior then raise exception using errcode='40001',message='A atividade mudou em outra sessão. Atualize para retomar.'; end if;
   if p_estado->'answers' is distinct from '[]'::jsonb or p_estado->>'finishedAt' is not null then raise exception using errcode='22023',message='Nova tentativa inválida.';end if;
   insert into public.agoraquiz_tentativas(id,usuario_id,aula_id,versao_conteudo,estado,ultima_operacao) values(p_id,p_usuario,p_aula,p_versao,p_estado,p_operacao) returning * into atual;
 else
   if atual.id is null or ultima is distinct from p_id or atual.revisao<>p_revisao or atual.versao_conteudo<>p_versao then raise exception using errcode='40001',message='A atividade mudou em outra sessão. Atualize para retomar.';end if;
   update public.agoraquiz_tentativas set estado=p_estado,revisao=revisao+1,ultima_operacao=p_operacao,atualizado_em=now() where id=p_id returning * into atual;
 end if;
 if atual.estado->>'finishedAt' is not null then
   respostas:=atual.estado->'answers';
   if jsonb_array_length(respostas)<>11 or exists(select 1 from jsonb_array_elements(respostas) a where a->>'read' is distinct from 'true') then raise exception using errcode='22023',message='Conclua todos os comentários antes do fechamento.';end if;
   insert into public.progresso(usuario_id,aula_id) values(p_usuario,p_aula) on conflict(usuario_id,aula_id) do nothing;
 end if;
 return to_jsonb(atual);
end $$;
revoke all on function public.agoraquiz_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.agoraquiz_gravar(uuid,uuid,uuid,integer,jsonb,boolean,uuid,uuid,integer) to service_role;

-- A rota manual e a API direta também não podem concluir uma atividade incompleta.
create function agoramed_privado.exigir_agoraquiz_concluido()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.aulas where id=new.aula_id and atividade is not null) and not exists(select 1 from public.agoraquiz_tentativas where usuario_id=new.usuario_id and aula_id=new.aula_id and estado->>'finishedAt' is not null) then
 raise exception using errcode='23514',message='Conclua o AgoraQuiz para registrar esta aula.';
 end if;
 return new;
end $$;
revoke all on function agoramed_privado.exigir_agoraquiz_concluido() from public,anon,authenticated;
create trigger progresso_exigir_agoraquiz before insert or update on public.progresso for each row execute function agoramed_privado.exigir_agoraquiz_concluido();
notify pgrst,'reload schema';
