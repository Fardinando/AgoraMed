begin;

create table public.agoramed_funil_diario (
  data date not null,
  evento text not null check (evento in (
    'landing_view', 'sample_open', 'sample_answer', 'buy_click',
    'checkout_view', 'checkout_start', 'payment_return'
  )),
  pagina text not null check (pagina in ('hipercalemia', 'matricula', 'pagamento')),
  area text not null check (area in (
    'pagina', 'hero', 'nav', 'oferta', 'final', 'sticky', 'demonstracao', 'checkout', 'pagamento'
  )),
  dispositivo text not null check (dispositivo in ('mobile', 'desktop')),
  origem text not null check (origem ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  midia text not null check (midia ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  campanha text not null check (campanha ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  quantidade bigint not null default 1 check (quantidade > 0),
  atualizado_em timestamptz not null default now(),
  primary key (data, evento, pagina, area, dispositivo, origem, midia, campanha)
);

create index agoramed_funil_data_evento
  on public.agoramed_funil_diario (data desc, evento);

alter table public.agoramed_funil_diario enable row level security;
revoke all on public.agoramed_funil_diario from public, anon, authenticated;
grant select, insert, update on public.agoramed_funil_diario to service_role;

create function public.agoramed_registrar_funil(
  p_evento text,
  p_pagina text,
  p_area text,
  p_dispositivo text,
  p_origem text,
  p_midia text,
  p_campanha text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.agoramed_funil_diario (
    data, evento, pagina, area, dispositivo, origem, midia, campanha
  ) values (
    (timezone('America/Fortaleza', now()))::date,
    p_evento, p_pagina, p_area, p_dispositivo,
    p_origem, p_midia, p_campanha
  )
  on conflict (data, evento, pagina, area, dispositivo, origem, midia, campanha)
  do update set
    quantidade = public.agoramed_funil_diario.quantidade + 1,
    atualizado_em = now();
end;
$$;

revoke all on function public.agoramed_registrar_funil(text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.agoramed_registrar_funil(text,text,text,text,text,text,text)
  to service_role;

commit;
