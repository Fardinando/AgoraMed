-- ============================================================
-- AGORAMED — migração 003
-- Cria os perfis de contas que foram criadas ANTES do gatilho
-- novo_usuario() existir (elas autenticam, mas não têm linha em
-- public.perfis → a plataforma reclamava "Perfil não encontrado").
-- Depois, rode de novo o supabase/promover-admin.sql com seu e-mail.
-- ============================================================

insert into public.perfis (id, email, nome, whatsapp)
select u.id,
       coalesce(u.email, ''),
       coalesce(u.raw_user_meta_data ->> 'nome', ''),
       coalesce(u.raw_user_meta_data ->> 'whatsapp', '')
  from auth.users u
  left join public.perfis p on p.id = u.id
 where p.id is null;

-- conferência: sua conta deve aparecer aqui (papel ainda 'aluno' é normal)
select email, nome, papel, liberado from public.perfis order by criado_em;
