begin;

alter table public.agoramed_funil_diario
  drop constraint if exists agoramed_funil_diario_evento_check;

alter table public.agoramed_funil_diario
  add constraint agoramed_funil_diario_evento_check check (evento in (
    'landing_view', 'sample_open', 'sample_answer', 'buy_click',
    'checkout_view', 'checkout_start', 'payment_return', 'payment_approved'
  ));

commit;
