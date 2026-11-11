-- Preserva o histórico sandbox quando a conta de teste é removida pelo Auth.
alter table public.pedidos_pagamento_teste alter column usuario_id drop not null;
alter table public.pedidos_pagamento_teste drop constraint pedidos_pagamento_teste_usuario_id_fkey;
alter table public.pedidos_pagamento_teste add constraint pedidos_pagamento_teste_usuario_id_fkey foreign key(usuario_id) references public.perfis(id) on delete set null;
