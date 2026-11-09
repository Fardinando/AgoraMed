-- Acesso simulado, isolado das matrículas reais. Somente o backend pode confirmar.
alter table public.pedidos_pagamento_teste add column confirmado_em timestamptz;
alter table public.pedidos_pagamento_teste add column acesso_ate timestamptz;
alter table public.pedidos_pagamento_teste add column atualizado_provedor_em timestamptz;
create or replace function public.confirmar_pagamento_teste(p_id uuid,p_estado text,p_atualizado timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pedidos_pagamento_teste; inicio timestamptz;
begin
 select * into p from public.pedidos_pagamento_teste where id=p_id for update;
 if not found then raise exception 'Pedido não encontrado'; end if;
 if p_estado not in ('pendente','aprovado','refunded','charged_back','cancelled','expired') or p_atualizado is null then raise exception 'Confirmação inválida'; end if;
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
