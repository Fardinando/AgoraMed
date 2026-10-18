-- ============================================================
-- AGORAMED — migração 004 (performance)
-- Índices para acelerar as consultas mais frequentes.
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- cursos ordenados por criado_em (usado em /api/app)
create index if not exists idx_cursos_criado_em on public.cursos (criado_em);

-- promos ativas ordenadas por ordem
create index if not exists idx_promos_ativo_ordem on public.promos (ativo, ordem);

-- perfis ordenados por criado_em (painel do professor)
create index if not exists idx_perfis_criado_em on public.perfis (criado_em);

-- matrículas por usuário (aluno vê seus cursos)
create index if not exists idx_matriculas_usuario on public.matriculas (usuario_id);

-- progresso por usuário (aulas concluídas)
create index if not exists idx_progresso_usuario on public.progresso (usuario_id);

-- comentários por aula
create index if not exists idx_comentarios_aula on public.comentarios (aula_id, criado_em);
