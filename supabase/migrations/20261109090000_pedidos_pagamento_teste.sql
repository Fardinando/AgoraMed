-- Sandbox deliberadamente sem vínculo com matrículas ou progresso reais.
create table public.pedidos_pagamento_teste (
 id uuid primary key,
 usuario_id uuid not null references public.perfis(id),
 curso_id uuid not null references public.cursos(id),
 preco_centavos integer not null check(preco_centavos between 100 and 99999999),
 acesso_meses integer not null check(acesso_meses in (6,12,24)),
 order_id text unique,
 checkout_url text,
 estado text not null default 'pendente' check(estado in ('pendente','aprovado','refunded','charged_back','cancelled','expired')),
 criado_em timestamptz not null default now()
);
create index pedidos_pagamento_teste_usuario on public.pedidos_pagamento_teste(usuario_id);
alter table public.pedidos_pagamento_teste enable row level security;
revoke all on public.pedidos_pagamento_teste from anon,authenticated;
grant select,insert,update on public.pedidos_pagamento_teste to service_role;
