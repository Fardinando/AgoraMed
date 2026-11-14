begin;

create table public.agoraquiz_eventos (
  id uuid primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  tentativa_id uuid not null references public.agoraquiz_tentativas(id) on delete cascade,
  questao_id text not null check (questao_id ~ '^aqz-hiper-[0-9]{3}$'),
  versao_conteudo integer not null check (versao_conteudo > 0),
  tipo text not null check (tipo in (
    'quiz_question_presented',
    'quiz_answer_submitted',
    'quiz_answer_evaluated',
    'quiz_explanation_viewed',
    'quiz_question_flagged_for_review',
    'quiz_review_completed',
    'quiz_competency_progress_updated'
  )),
  modalidade text not null check (modalidade in ('estudo','simulado')),
  alternativa text check (alternativa in ('A','B','C','D')),
  correta boolean,
  tempo_resposta_ms integer check (tempo_resposta_ms between 0 and 3600000),
  competencias text[] not null default '{}',
  estado_revisao text not null default 'nao_avaliado'
    check (estado_revisao in ('nao_avaliado','precisa_revisar','em_revisao','dominada')),
  ocorrido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  check (
    (tipo in ('quiz_answer_submitted','quiz_answer_evaluated','quiz_question_flagged_for_review') and alternativa is not null)
    or (tipo not in ('quiz_answer_submitted','quiz_answer_evaluated','quiz_question_flagged_for_review'))
  ),
  check (tipo <> 'quiz_answer_evaluated' or correta is not null)
);

create index agoraquiz_eventos_aluno_curso_tempo
  on public.agoraquiz_eventos(usuario_id, curso_id, ocorrido_em desc);
create index agoraquiz_eventos_aluno_questao_tempo
  on public.agoraquiz_eventos(usuario_id, questao_id, ocorrido_em desc);

alter table public.agoraquiz_eventos enable row level security;
revoke all on public.agoraquiz_eventos from public, anon, authenticated;
grant select, insert on public.agoraquiz_eventos to service_role;

create function public.agoraquiz_registrar_evento(
  p_id uuid,
  p_usuario uuid,
  p_curso uuid,
  p_tentativa uuid,
  p_questao text,
  p_versao integer,
  p_tipo text,
  p_modalidade text,
  p_alternativa text,
  p_correta boolean,
  p_tempo_ms integer,
  p_competencias text[],
  p_estado_revisao text,
  p_ocorrido_em timestamptz
)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare inseridos integer;
begin
  insert into public.agoraquiz_eventos(
    id, usuario_id, curso_id, tentativa_id, questao_id, versao_conteudo,
    tipo, modalidade, alternativa, correta, tempo_resposta_ms,
    competencias, estado_revisao, ocorrido_em
  ) values (
    p_id, p_usuario, p_curso, p_tentativa, p_questao, p_versao,
    p_tipo, p_modalidade, p_alternativa, p_correta, p_tempo_ms,
    coalesce(p_competencias, '{}'), coalesce(p_estado_revisao, 'nao_avaliado'),
    coalesce(p_ocorrido_em, now())
  ) on conflict (id) do nothing;
  get diagnostics inseridos = row_count;
  return inseridos = 1;
end;
$$;

revoke all on function public.agoraquiz_registrar_evento(uuid,uuid,uuid,uuid,text,integer,text,text,text,boolean,integer,text[],text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.agoraquiz_registrar_evento(uuid,uuid,uuid,uuid,text,integer,text,text,text,boolean,integer,text[],text,timestamptz)
  to service_role;

commit;
