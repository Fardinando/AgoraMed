create or replace function agoramed_privado.exigir_agoraquiz_concluido()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.aulas where id=new.aula_id and atividade is not null) then
   if not exists(select 1 from public.agoraquiz_tentativas where usuario_id=new.usuario_id and aula_id=new.aula_id and estado->>'finishedAt' is not null) then
     raise exception using errcode='23514',message='Conclua o AgoraQuiz para registrar esta aula.';
   end if;
 end if;
 return new;
end $$;
revoke all on function agoramed_privado.exigir_agoraquiz_concluido() from public,anon,authenticated;
