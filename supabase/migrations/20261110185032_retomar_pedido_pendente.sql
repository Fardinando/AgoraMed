create or replace function public.reservar_pedido_pagamento(p_id uuid,p_usuario uuid,p_curso uuid)
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
 select * into p from public.pedidos_pagamento where usuario_id=p_usuario and curso_id=p_curso and estado='pendente' and criado_em>now()-interval '1 day' order by criado_em desc limit 1;
 if found then return to_jsonb(p);end if;
 select * into c from public.cursos where id=p_curso;
 if not found or c.tipo_acesso<>'pago' or c.config_pagamento->>'provedor'<>'mercado_pago' or c.config_pagamento->>'vendas_ativas' is distinct from 'true' then raise exception 'Vendas indisponíveis'; end if;
 insert into public.pedidos_pagamento(id,usuario_id,curso_id,preco_centavos,acesso_meses)
 values(p_id,p_usuario,p_curso,(c.config_pagamento->>'preco_centavos')::integer,(c.config_pagamento->>'acesso_meses')::integer) returning * into p;
 return to_jsonb(p);
end $$;
revoke all on function public.reservar_pedido_pagamento(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reservar_pedido_pagamento(uuid,uuid,uuid) to service_role;
