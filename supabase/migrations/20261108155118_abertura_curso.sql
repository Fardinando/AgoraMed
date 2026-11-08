-- Área de abertura separada das aulas e de seu progresso.
alter table public.cursos add column abertura jsonb;
alter table public.cursos add constraint cursos_abertura_valida check (
 abertura is null or coalesce(jsonb_typeof(abertura)='object'
 and jsonb_typeof(abertura->'youtube_id')='string'
 and (abertura->>'youtube_id'='' or abertura->>'youtube_id' ~ '^[a-zA-Z0-9_-]{11}$')
 and jsonb_typeof(abertura->'duracao')='string'
 and length(abertura->>'duracao')<=30,false)
);
-- Inclui o campo no salvamento existente, preservando versão e idempotência.
do $mig$
declare fonte text; nova text;
begin
 fonte:=pg_get_functiondef('public.salvar_curso_atomico(jsonb,integer,jsonb,uuid,uuid,text)'::regprocedure);
 nova:=replace(fonte,'tipo_acesso,url_vendas,config_pagamento)','tipo_acesso,url_vendas,config_pagamento,abertura)');
 nova:=replace(nova,'nullif(p_curso->''config_pagamento'',''null''::jsonb))','nullif(p_curso->''config_pagamento'',''null''::jsonb),nullif(p_curso->''abertura'',''null''::jsonb))');
 nova:=replace(nova,'else public.cursos.config_pagamento end;','else public.cursos.config_pagamento end,abertura=case when p_curso ? ''abertura'' then excluded.abertura else public.cursos.abertura end;');
 if nova=fonte or position('config_pagamento,abertura)' in nova)=0 or position('abertura=case' in nova)=0 then raise exception 'Função incompatível. Nenhuma alteração aplicada.';end if;
 execute nova;
end $mig$;
