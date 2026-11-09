-- UID não é segredo. Tokens e chave de assinatura ficam somente no servidor.
alter table public.aulas add column stream_uid text not null default '' check (stream_uid='' or stream_uid ~ '^[a-f0-9]{32}$');
alter table public.cursos drop constraint cursos_abertura_valida;
alter table public.cursos add constraint cursos_abertura_valida check (
 abertura is null or coalesce(jsonb_typeof(abertura)='object'
 and jsonb_typeof(abertura->'youtube_id')='string'
 and (abertura->>'youtube_id'='' or abertura->>'youtube_id' ~ '^[a-zA-Z0-9_-]{11}$')
 and jsonb_typeof(abertura->'duracao')='string' and length(abertura->>'duracao')<=30
 and (not (abertura ? 'stream_uid') or (jsonb_typeof(abertura->'stream_uid')='string' and (abertura->>'stream_uid'='' or abertura->>'stream_uid' ~ '^[a-f0-9]{32}$'))),false)
);
do $mig$
declare fonte text; nova text;
begin
 fonte:=pg_get_functiondef('public.salvar_curso_atomico(jsonb,integer,jsonb,uuid,uuid,text)'::regprocedure);
 nova:=replace(fonte,'insert into public.aulas(id,modulo_id,titulo,ordem,youtube_id,duracao,descricao) values(aid,mid,a->>''titulo'',(a->>''ordem'')::integer,coalesce(a->>''youtube_id'',''''),coalesce(a->>''duracao'',''''),coalesce(a->>''descricao'',''''))',
 'insert into public.aulas(id,modulo_id,titulo,ordem,youtube_id,duracao,descricao,stream_uid) values(aid,mid,a->>''titulo'',(a->>''ordem'')::integer,coalesce(a->>''youtube_id'',''''),coalesce(a->>''duracao'',''''),coalesce(a->>''descricao'',''''),coalesce(a->>''stream_uid'',''''))');
 nova:=replace(nova,'youtube_id=excluded.youtube_id,duracao=excluded.duracao,descricao=excluded.descricao','youtube_id=excluded.youtube_id,duracao=excluded.duracao,descricao=excluded.descricao,stream_uid=case when a ? ''stream_uid'' then excluded.stream_uid else public.aulas.stream_uid end');
 nova:=replace(nova,'public.aulas.duracao,public.aulas.descricao) is distinct from (excluded.modulo_id,excluded.titulo,excluded.ordem,excluded.youtube_id,excluded.duracao,excluded.descricao)',
 'public.aulas.duracao,public.aulas.descricao,public.aulas.stream_uid) is distinct from (excluded.modulo_id,excluded.titulo,excluded.ordem,excluded.youtube_id,excluded.duracao,excluded.descricao,case when a ? ''stream_uid'' then excluded.stream_uid else public.aulas.stream_uid end)');
 if nova=fonte or position('descricao,stream_uid) values' in nova)=0 or position('stream_uid=case' in nova)=0 then raise exception 'Função incompatível: nenhuma alteração aplicada.';end if;
 execute nova;
end $mig$;
