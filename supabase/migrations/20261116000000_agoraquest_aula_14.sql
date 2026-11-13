-- AgoraQuest Aula 14 — vínculo da atividade já publicada no conteúdo versionado.
-- Aditivo: apenas registra a atividade e a associa à aula do Módulo 04 do curso
-- de Hipercalemia ("Oficina de prescrição inicial"), décima quarta aula na ordem
-- do curso. Não altera tabelas, funções do caderno, tentativas, matrículas,
-- progresso nem as Aulas 01 a 13.

do $$
declare
  v_curso uuid;
  v_titulo_curso text;
  v_aula uuid;
  v_titulo_aula text;
begin
  select c.id, c.titulo into v_curso, v_titulo_curso
  from public.cursos c
  where c.id = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983'
     or c.titulo ilike '%hipercalemia%'
  order by (c.id = 'fa3c5d8d-94c4-4321-be7a-1cc45741a983') desc, c.criado_em asc
  limit 1;

  if v_curso is null then
    raise notice 'AgoraQuest: curso de Hipercalemia não encontrado; Aula 14 não vinculada.';
    return;
  end if;

  select a.id, a.titulo into v_aula, v_titulo_aula
  from public.aulas a
  join public.modulos m on m.id = a.modulo_id
  where m.curso_id = v_curso
    and a.titulo ilike '%prescrição inicial%'
  order by m.ordem asc, m.id asc, a.ordem asc, a.id asc
  limit 1;

  if v_aula is null then
    select id, titulo into v_aula, v_titulo_aula
    from (
      select a.id, a.titulo,
             row_number() over (order by m.ordem asc, m.id asc, a.ordem asc, a.id asc) as posicao
      from public.aulas a
      join public.modulos m on m.id = a.modulo_id
      where m.curso_id = v_curso
    ) ordenadas
    where posicao = 14;
  end if;

  if v_aula is null then
    raise notice 'AgoraQuest: décima quarta aula não encontrada em %; Aula 14 não vinculada.', v_titulo_curso;
    return;
  end if;

  if exists (select 1 from public.agoraquest_atividades
             where aula_id = v_aula and slug <> 'hipercalemia-aula-14-v1') then
    raise notice 'AgoraQuest: a aula "%" já possui outra atividade; Aula 14 não vinculada.', v_titulo_aula;
    return;
  end if;

  delete from public.agoraquest_atividades
  where slug = 'hipercalemia-aula-14-v1' and aula_id <> v_aula;

  insert into public.agoraquest_atividades(slug, aula_id, versao_conteudo, titulo)
  values ('hipercalemia-aula-14-v1', v_aula, 1, 'Hipercalemia — Aula 14')
  on conflict (slug) do update
    set aula_id = excluded.aula_id,
        versao_conteudo = excluded.versao_conteudo,
        titulo = excluded.titulo,
        atualizado_em = now();

  raise notice 'AgoraQuest Aula 14 vinculado ao curso "%" e à aula "%" (%).', v_titulo_curso, v_titulo_aula, v_aula;
end $$;

notify pgrst, 'reload schema';
