-- AGORAMED — migração 001
-- A coluna `emoji` (usada nas divulgações do painel) foi adicionada depois do
-- schema.sql inicial. Execute UMA vez no SQL Editor do Supabase.
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '🎓';
