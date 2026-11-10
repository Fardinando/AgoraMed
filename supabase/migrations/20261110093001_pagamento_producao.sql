-- Registro de vendas reais, separado de todo o sandbox.
create table public.pedidos_pagamento (
 id uuid primary key,
 usuario_id uuid references public.perfis(id) on delete set null,
 curso_id uuid not null references public.cursos(id),
 preco_centavos integer not null check(preco_centavos between 100 and 99999999),
 acesso_meses integer not null check(acesso_meses in (6,12,24)),
 order_id text unique check(order_id ~ '^ORD[A-Z0-9]+$' and order_id not like 'ORDTST%'),
 checkout_url text,
 estado text not null default 'pendente' check(estado in ('pendente','aprovado','rejeitado','refunded','charged_back','cancelled','expired','revisao')),
 criado_em timestamptz not null default now(),
 confirmado_em timestamptz,
 acesso_ate timestamptz,
 atualizado_provedor_em timestamptz
);
create index pedidos_pagamento_usuario_curso on public.pedidos_pagamento(usuario_id,curso_id,estado,acesso_ate);
create index pedidos_pagamento_curso on public.pedidos_pagamento(curso_id);
alter table public.pedidos_pagamento enable row level security;
revoke all on public.pedidos_pagamento from anon,authenticated;
grant select,insert,update on public.pedidos_pagamento to service_role;
alter table public.matriculas add column origem text not null default 'manual' check(origem in ('manual','mercado_pago'));
alter table public.matriculas add column expira_em timestamptz;
alter table public.matriculas add column pedido_pagamento_id uuid references public.pedidos_pagamento(id);
alter table public.matriculas add constraint matriculas_origem_valida check(
 (origem='manual' and expira_em is null and pedido_pagamento_id is null) or
 (origem='mercado_pago' and expira_em is not null and pedido_pagamento_id is not null));
create index matriculas_pedido on public.matriculas(pedido_pagamento_id) where pedido_pagamento_id is not null;

alter table public.cursos drop constraint cursos_config_pagamento_valida;
alter table public.cursos add constraint cursos_config_pagamento_valida check(config_pagamento is null or coalesce(
 tipo_acesso='pago' and jsonb_typeof(config_pagamento)='object'
 and config_pagamento->>'provedor'='mercado_pago' and jsonb_typeof(config_pagamento->'vendas_ativas')='boolean'
 and jsonb_typeof(config_pagamento->'preco_centavos')='number'
 and (config_pagamento->>'preco_centavos')::numeric between 100 and 99999999
 and (config_pagamento->>'preco_centavos')::numeric=trunc((config_pagamento->>'preco_centavos')::numeric)
 and config_pagamento->>'acesso_meses' in ('6','12','24'),false));

create function public.reservar_pedido_pagamento(p_id uuid,p_usuario uuid,p_curso uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.cursos; p public.pedidos_pagamento;
begin
 perform 1 from public.perfis where id=p_usuario and liberado for update;
 if not found then raise exception 'Conta indisponível'; end if;
 select * into p from public.pedidos_pagamento where id=p_id;
 if found then
  if p.usuario_id is distinct from p_usuario or p.curso_id<>p_curso then raise exception 'Pedido incompatível'; end if;
  if p.criado_em<now()-interval '1 day' and p.estado<>'aprovado' then raise exception 'Pedido expirado'; end if;
  return to_jsonb(p);
 end if;
 select * into c from public.cursos where id=p_curso;
 if not found or c.tipo_acesso<>'pago' or c.config_pagamento->>'provedor'<>'mercado_pago' or c.config_pagamento->>'vendas_ativas' is distinct from 'true' then raise exception 'Vendas indisponíveis'; end if;
 insert into public.pedidos_pagamento(id,usuario_id,curso_id,preco_centavos,acesso_meses)
 values(p_id,p_usuario,p_curso,(c.config_pagamento->>'preco_centavos')::integer,(c.config_pagamento->>'acesso_meses')::integer) returning * into p;
 return to_jsonb(p);
end $$;
revoke all on function public.reservar_pedido_pagamento(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reservar_pedido_pagamento(uuid,uuid,uuid) to service_role;

create function public.confirmar_pagamento(p_id uuid,p_estado text,p_atualizado timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pedidos_pagamento; inicio timestamptz; melhor public.pedidos_pagamento;
begin
 select * into p from public.pedidos_pagamento where id=p_id for update;
 if not found or p.order_id is null or p.order_id like 'ORDTST%' then raise exception 'Pedido inválido'; end if;
 if p_estado not in ('pendente','aprovado','rejeitado','refunded','charged_back','cancelled','expired','revisao') or p_atualizado is null then raise exception 'Confirmação inválida'; end if;
 if p.atualizado_provedor_em is null or p_atualizado>p.atualizado_provedor_em then
  inicio:=case when p_estado='aprovado' then coalesce(p.confirmado_em,now()) else p.confirmado_em end;
  update public.pedidos_pagamento set estado=p_estado,atualizado_provedor_em=p_atualizado,
   confirmado_em=inicio,acesso_ate=case when inicio is not null then coalesce(p.acesso_ate,inicio+make_interval(months=>p.acesso_meses)) else null end
  where id=p_id returning * into p;
 end if;
 if p.usuario_id is not null then
  -- Serializa a reconciliação de compras concorrentes do mesmo aluno/curso.
  perform 1 from public.perfis where id=p.usuario_id for update;
  select * into melhor from public.pedidos_pagamento q where q.usuario_id=p.usuario_id and q.curso_id=p.curso_id and q.estado='aprovado' and q.acesso_ate>now() order by q.acesso_ate desc,q.id limit 1;
  if found then
   insert into public.matriculas(usuario_id,curso_id,origem,expira_em,pedido_pagamento_id)
   values(p.usuario_id,p.curso_id,'mercado_pago',melhor.acesso_ate,melhor.id)
   on conflict(usuario_id,curso_id) do update set expira_em=excluded.expira_em,pedido_pagamento_id=excluded.pedido_pagamento_id
    where public.matriculas.origem='mercado_pago';
  else
   delete from public.matriculas where usuario_id=p.usuario_id and curso_id=p.curso_id and origem='mercado_pago';
  end if;
 end if;
 return jsonb_build_object('estado',p.estado,'inicio',p.confirmado_em,'fim',p.acesso_ate,'acessoLiberado',exists(select 1 from public.matriculas m where m.usuario_id=p.usuario_id and m.curso_id=p.curso_id and (m.expira_em is null or m.expira_em>now())));
end $$;
revoke all on function public.confirmar_pagamento(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.confirmar_pagamento(uuid,text,timestamptz) to service_role;

-- As policies existentes herdam a validade pelo helper central.
create or replace function agoramed_privado.pode_acessar_curso(curso uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfis p join public.cursos c on c.id=curso
 where p.id=(select auth.uid()) and p.liberado and (p.papel='admin' or c.tipo_acesso='gratis' or exists(
  select 1 from public.matriculas m where m.usuario_id=p.id and m.curso_id=c.id and (m.expira_em is null or m.expira_em>now()))));
$$;
-- As atividades conferem a matrícula diretamente; acrescenta validade onde já existem.
do $mig$
declare r record; fonte text; nova text;
begin
 for r in select oid::regprocedure as assinatura from pg_proc where pronamespace='public'::regnamespace and proname in ('agoraquiz_gravar','plantao_virtual_gravar','quiz_aula_gravar') loop
  fonte:=pg_get_functiondef(r.assinatura);
  nova:=replace(fonte,'where usuario_id=p_usuario and curso_id=c.id','where usuario_id=p_usuario and curso_id=c.id and (expira_em is null or expira_em>now())');
  if nova=fonte then raise exception 'Atividade incompatível: %',r.assinatura; end if;
  execute nova;
 end loop;
end $mig$;
