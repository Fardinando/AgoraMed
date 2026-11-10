-- Apenas o ledger de testes; não altera matrículas nem políticas de cursos.
alter table public.pedidos_pagamento_teste drop constraint pedidos_pagamento_teste_estado_check;
alter table public.pedidos_pagamento_teste add constraint pedidos_pagamento_teste_estado_check
 check(estado in ('pendente','aprovado','rejeitado','refunded','charged_back','cancelled','expired'));
create or replace function public.confirmar_pagamento_teste(p_id uuid,p_estado text,p_atualizado timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pedidos_pagamento_teste; inicio timestamptz;
begin
 select * into p from public.pedidos_pagamento_teste where id=p_id for update;
 if not found then raise exception 'Pedido não encontrado'; end if;
 if p_estado not in ('pendente','aprovado','rejeitado','refunded','charged_back','cancelled','expired') or p_atualizado is null then raise exception 'Confirmação inválida'; end if;
 if p.atualizado_provedor_em is null or p_atualizado>p.atualizado_provedor_em then
  inicio:=case when p_estado='aprovado' then coalesce(p.confirmado_em,now()) else p.confirmado_em end;
  update public.pedidos_pagamento_teste set estado=p_estado,atualizado_provedor_em=p_atualizado,
   confirmado_em=inicio,acesso_ate=case when inicio is not null then coalesce(p.acesso_ate,inicio+make_interval(months=>p.acesso_meses)) else null end
  where id=p_id returning * into p;
 end if;
 return jsonb_build_object('estado',p.estado,'inicio',p.confirmado_em,'fim',p.acesso_ate,'acessoSimulado',p.estado='aprovado' and p.acesso_ate>now(),'acessoRealLiberado',false);
end $$;
revoke all on function public.confirmar_pagamento_teste(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.confirmar_pagamento_teste(uuid,text,timestamptz) to service_role;

-- Marker gravado exclusivamente pela API administrativa de Auth, nunca user_metadata.
-- Esta RPC não concede acesso via RLS. Só o backend da branch de homologação a usa.
create function public.acessos_checkout_teste(p_usuario uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'participante', exists(select 1 from auth.users u join public.perfis f on f.id=u.id
    where u.id=p_usuario and u.raw_app_meta_data->>'agoramed_checkout_teste'='true'
      and f.papel='aluno' and f.liberado),
  'cursos', coalesce((select jsonb_agg(distinct p.curso_id) from public.pedidos_pagamento_teste p
    join auth.users u on u.id=p.usuario_id join public.perfis f on f.id=u.id
    where p.usuario_id=p_usuario and u.raw_app_meta_data->>'agoramed_checkout_teste'='true'
      and f.papel='aluno' and f.liberado and p.estado='aprovado'
      and p.acesso_ate>now() and p.order_id like 'ORDTST%'), '[]'::jsonb));
$$;
revoke all on function public.acessos_checkout_teste(uuid) from public,anon,authenticated;
grant execute on function public.acessos_checkout_teste(uuid) to service_role;
