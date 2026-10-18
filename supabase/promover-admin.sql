-- ============================================================
-- AGORAMED — transforma uma conta em professor(a)/admin
-- Troque o e-mail abaixo pelo e-mail da sua conta e execute
-- UMA vez no SQL Editor do Supabase, depois do primeiro cadastro.
-- ============================================================

update public.perfis
   set papel = 'admin',
       liberado = true
 where email = 'SEU_EMAIL_AQUI@exemplo.com';

-- conferência: deve retornar 1 linha
select email, nome, papel, liberado from public.perfis where papel = 'admin';
