-- Checkout direto com o Mercado Pago: o pedido só ganha um titular após
-- confirmação do pagamento e correspondência do e-mail verificado da conta.
alter table public.pedidos_pagamento add column if not exists payer_email text;

-- Um pedido pago não pode ser associado a mais de uma matrícula.
create unique index if not exists matriculas_pedido_pagamento_unico
 on public.matriculas(pedido_pagamento_id)
 where pedido_pagamento_id is not null;

create or replace function public.reservar_pedido_pagamento_sem_conta(p_id uuid,p_curso uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.cursos; p public.pedidos_pagamento;
begin
 select * into p from public.pedidos_pagamento where id=p_id for update;
 if found then
  if p.usuario_id is not null or p.curso_id is distinct from p_curso then raise exception 'Pedido incompatível'; end if;
  if p.criado_em<now()-interval '1 day' and p.estado<>'aprovado' then raise exception 'Pedido expirado'; end if;
  return to_jsonb(p);
 end if;
 select * into c from public.cursos where id=p_curso;
 if not found or c.tipo_acesso<>'pago' or c.config_pagamento->>'provedor'<>'mercado_pago' or c.config_pagamento->>'vendas_ativas' is distinct from 'true' then raise exception 'Vendas indisponíveis'; end if;
 insert into public.pedidos_pagamento(id,usuario_id,curso_id,preco_centavos,acesso_meses)
 values(p_id,null,p_curso,(c.config_pagamento->>'preco_centavos')::integer,(c.config_pagamento->>'acesso_meses')::integer) returning * into p;
 return to_jsonb(p);
end $$;
revoke all on function public.reservar_pedido_pagamento_sem_conta(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reservar_pedido_pagamento_sem_conta(uuid,uuid) to service_role;

create or replace function public.confirmar_pagamento_com_email(p_id uuid,p_estado text,p_atualizado timestamptz,p_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pedidos_pagamento; email_normalizado text; resultado jsonb;
begin
 email_normalizado:=nullif(lower(btrim(coalesce(p_email,''))),'');
 if email_normalizado is not null and email_normalizado !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail do pagador inválido'; end if;
 select * into p from public.pedidos_pagamento where id=p_id for update;
 if not found or p.order_id is null or p.order_id like 'ORDTST%' then raise exception 'Pedido inválido'; end if;
 if p.payer_email is not null and email_normalizado is not null and p.payer_email<>email_normalizado then raise exception 'E-mail do pagador incompatível'; end if;
 if p.payer_email is null and email_normalizado is not null then
  update public.pedidos_pagamento set payer_email=email_normalizado where id=p_id returning * into p;
 end if;
 resultado:=public.confirmar_pagamento(p_id,p_estado,p_atualizado);
 return resultado||jsonb_build_object('emailPagador',p.payer_email);
end $$;
revoke all on function public.confirmar_pagamento_com_email(uuid,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.confirmar_pagamento_com_email(uuid,text,timestamptz,text) to service_role;

create or replace function public.reivindicar_pedido_pagamento(p_id uuid,p_usuario uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pedidos_pagamento; f public.perfis; email_normalizado text;
begin
 select * into p from public.pedidos_pagamento where id=p_id for update;
 if not found or p.curso_id<>'fa3c5d8d-94c4-4321-be7a-1cc45741a983'::uuid then raise exception 'PEDIDO_INCOMPATIVEL'; end if;
 if p.estado<>'aprovado' or p.acesso_ate is null or p.acesso_ate<=now() then raise exception 'PAGAMENTO_NAO_APROVADO'; end if;
 if p.payer_email is null then raise exception 'EMAIL_DO_PAGADOR_AUSENTE'; end if;
 select * into f from public.perfis where id=p_usuario and liberado and papel='aluno' for update;
 if not found then raise exception 'CONTA_INDISPONIVEL'; end if;
 email_normalizado:=lower(btrim(f.email));
 if email_normalizado is distinct from p.payer_email then raise exception 'EMAIL_DO_PAGADOR_DIFERENTE'; end if;
 if p.usuario_id is not null and p.usuario_id<>p_usuario then raise exception 'PEDIDO_JA_VINCULADO'; end if;
 update public.pedidos_pagamento set usuario_id=p_usuario where id=p_id and usuario_id is null;
 insert into public.matriculas(usuario_id,curso_id,origem,expira_em,pedido_pagamento_id)
 values(p_usuario,p.curso_id,'mercado_pago',p.acesso_ate,p.id)
 on conflict(usuario_id,curso_id) do update set
  expira_em=greatest(public.matriculas.expira_em,excluded.expira_em),
  pedido_pagamento_id=excluded.pedido_pagamento_id
 where public.matriculas.origem='mercado_pago';
 if not exists(select 1 from public.matriculas m where m.usuario_id=p_usuario and m.curso_id=p.curso_id and m.pedido_pagamento_id=p.id and m.expira_em>now()) then
  raise exception 'MATRICULA_NAO_VINCULADA';
 end if;
 return jsonb_build_object('acessoLiberado',true,'inicio',p.confirmado_em,'fim',p.acesso_ate,'emailPagador',p.payer_email);
end $$;
revoke all on function public.reivindicar_pedido_pagamento(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reivindicar_pedido_pagamento(uuid,uuid) to service_role;
