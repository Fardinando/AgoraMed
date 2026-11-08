-- Apenas configuração da oferta; ainda não cria pedidos, cobranças ou acessos.
alter table public.cursos add column if not exists config_pagamento jsonb;
alter table public.cursos add constraint cursos_config_pagamento_valida check (
 config_pagamento is null or coalesce(
  tipo_acesso='pago' and jsonb_typeof(config_pagamento)='object'
  and config_pagamento @> '{"provedor":"mercado_pago","vendas_ativas":false}'::jsonb
  and jsonb_typeof(config_pagamento->'preco_centavos')='number'
  and (config_pagamento->>'preco_centavos')::numeric between 100 and 99999999
  and (config_pagamento->>'preco_centavos')::numeric=trunc((config_pagamento->>'preco_centavos')::numeric)
  and config_pagamento->>'acesso_meses' in ('6','12','24'),false)
);
-- Preserva a função atual e sua proteção de concorrência/idempotência.
do $mig$
declare fonte text; nova text;
begin
 fonte:=pg_get_functiondef('public.salvar_curso_atomico(jsonb,integer,jsonb,uuid,uuid,text)'::regprocedure);
 nova:=replace(fonte,'tipo_acesso,url_vendas)','tipo_acesso,url_vendas,config_pagamento)');
 nova:=replace(nova, 'coalesce(p_curso->>''url_vendas'',''''))', 'coalesce(p_curso->>''url_vendas'',''''),nullif(p_curso->''config_pagamento'',''null''::jsonb))');
 nova:=replace(nova,'url_vendas=excluded.url_vendas;','url_vendas=excluded.url_vendas,config_pagamento=case when p_curso ? ''config_pagamento'' then excluded.config_pagamento else public.cursos.config_pagamento end;');
 if nova=fonte or position('config_pagamento=case' in nova)=0 or position('url_vendas,config_pagamento)' in nova)=0 then raise exception 'Função de salvamento incompatível. Nenhuma alteração aplicada.'; end if;
 execute nova;
end $mig$;
