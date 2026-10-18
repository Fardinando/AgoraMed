-- ============================================================
-- AGORAMED — migração 002
-- Corrige o gatilho que bloqueava até o próprio servidor:
-- agora o SQL Editor (postgres) e o service_role (nossa API)
-- conseguem alterar papel/liberado; alunos continuam bloqueados.
-- Execute UMA vez no SQL Editor do Supabase e, em seguida,
-- rode de novo o supabase/promover-admin.sql.
-- ============================================================

create or replace function public.bloquear_auto_promocao()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (tg_op = 'UPDATE'
      and (new.papel is distinct from old.papel
           or new.liberado is distinct from old.liberado)
      and not (public.eh_admin()
               or coalesce(auth.role(), 'postgres') in ('postgres', 'service_role'))) then
    raise exception 'Somente o professor altera papel ou liberação de contas.';
  end if;
  return new;
end $$;

-- conferência: deve responder 1 linha (papel = admin, liberado = true)
select email, nome, papel, liberado from public.perfis where papel = 'admin';
