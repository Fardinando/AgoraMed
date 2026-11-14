create table if not exists public.agoraprescreva_tentativas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  operation_id uuid not null,
  estado jsonb not null,
  resultado jsonb not null,
  criada_em timestamptz not null default now(),
  finalizada_em timestamptz not null default now(),
  constraint agoraprescreva_tentativas_usuario_operacao_key unique (usuario_id, operation_id)
);

create index if not exists agoraprescreva_tentativas_usuario_curso_idx
  on public.agoraprescreva_tentativas (usuario_id, curso_id, finalizada_em desc);

alter table public.agoraprescreva_tentativas enable row level security;
revoke all on table public.agoraprescreva_tentativas from public, anon, authenticated;
grant select, insert, update, delete on table public.agoraprescreva_tentativas to service_role;
