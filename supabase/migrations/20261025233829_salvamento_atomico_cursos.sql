-- Compatível com os dados existentes: apenas acrescenta versão, controles e funções.
alter table public.cursos add column versao integer not null default 1 check (versao > 0);
create table public.operacoes_curso (
  operacao_id uuid primary key,
  curso_id uuid not null,
  admin_id uuid not null,
  assinatura text not null,
  requisicao text not null,
  resultado jsonb not null,
  criado_em timestamptz not null default now()
);
create table public.arquivos_curso_pendentes (
  bucket text not null check (bucket in ('capas','materiais')),
  caminho text not null,
  disponivel_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  primary key (bucket,caminho)
);
create index arquivos_curso_pendentes_disponivel on public.arquivos_curso_pendentes (disponivel_em);
alter table public.operacoes_curso enable row level security;
alter table public.arquivos_curso_pendentes enable row level security;
revoke all on public.operacoes_curso, public.arquivos_curso_pendentes from public, anon, authenticated;
grant select,insert,update,delete on public.operacoes_curso, public.arquivos_curso_pendentes to service_role;

-- Também detecta alterações por outros caminhos de administração.
create function agoramed_privado.incrementar_versao_curso()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.versao := old.versao + 1;
  return new;
end $$;
create trigger curso_incrementar_versao before update on public.cursos
for each row execute function agoramed_privado.incrementar_versao_curso();

create function agoramed_privado.conteudo_alterado()
returns trigger language plpgsql security invoker set search_path='' as $$
declare antigos uuid[] := '{}'; novos uuid[] := '{}'; cursos uuid[]; c uuid;
begin
  if tg_op='UPDATE' and to_jsonb(new)=to_jsonb(old) then return new; end if;
  if tg_table_name='modulos' then
    if tg_op<>'INSERT' then antigos:=array[old.curso_id]; end if;
    if tg_op<>'DELETE' then novos:=array[new.curso_id]; end if;
    cursos:=antigos||novos;
  elsif tg_table_name='aulas' then
    if tg_op<>'INSERT' then antigos:=array[old.modulo_id]; end if;
    if tg_op<>'DELETE' then novos:=array[new.modulo_id]; end if;
    select array_agg(distinct curso_id) into cursos from public.modulos where id=any(antigos||novos);
  else
    if tg_op<>'INSERT' then antigos:=array[old.aula_id]; end if;
    if tg_op<>'DELETE' then novos:=array[new.aula_id]; end if;
    select array_agg(distinct m.curso_id) into cursos from public.aulas a join public.modulos m on m.id=a.modulo_id where a.id=any(antigos||novos);
  end if;
  for c in select distinct unnest(cursos) order by 1 loop
    update public.cursos set versao=versao+1 where id=c;
  end loop;
  return coalesce(new,old);
end $$;
create trigger modulos_atualizar_versao after insert or update or delete on public.modulos for each row execute function agoramed_privado.conteudo_alterado();
create trigger aulas_atualizar_versao after insert or update or delete on public.aulas for each row execute function agoramed_privado.conteudo_alterado();
create trigger materiais_atualizar_versao after insert or update or delete on public.materiais for each row execute function agoramed_privado.conteudo_alterado();
revoke all on function agoramed_privado.incrementar_versao_curso(),agoramed_privado.conteudo_alterado() from public,anon,authenticated;

create function public.salvar_curso_atomico(p_curso jsonb,p_versao integer,p_removidos jsonb,p_operacao uuid,p_admin uuid,p_acao text default 'salvar')
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='5s' as $$
declare
  cid uuid := (p_curso->>'id')::uuid;
  anterior public.cursos%rowtype;
  repetida public.operacoes_curso%rowtype;
  assinatura text := md5(p_curso::text||coalesce(p_removidos,'{}')::text||p_versao::text||p_acao);
  m jsonb; a jsonb; p jsonb; mid uuid; aid uuid; pid uuid;
  mods uuid[] := '{}'; aulas uuid[] := '{}'; mats uuid[] := '{}';
  rm_mods uuid[]; rm_aulas uuid[]; rm_mats uuid[];
  resultado jsonb; salvo jsonb; capaanterior text;
begin
  if not exists(select 1 from public.perfis where id=p_admin and papel='admin' and liberado) then
    raise exception using errcode='42501',message='Somente professores ativos podem salvar cursos.';
  end if;
  if cid is null or p_operacao is null or p_versao is null or p_versao<0 or p_acao not in ('salvar','excluir') then
    raise exception using errcode='22023',message='Solicitação de salvamento incompleta.';
  end if;
  -- Uma tentativa repetida aguarda a primeira e recebe o mesmo resultado.
  perform pg_advisory_xact_lock(hashtextextended(p_operacao::text,0));
  select * into repetida from public.operacoes_curso where operacao_id=p_operacao;
  if found then
    if repetida.assinatura<>assinatura or repetida.admin_id<>p_admin then
      raise exception using errcode='22023',message='Identificador de salvamento já utilizado com outras alterações.';
    end if;
    return repetida.resultado;
  end if;
  -- Serializa também a criação, quando ainda não existe uma linha para bloquear.
  perform pg_advisory_xact_lock(hashtextextended('curso:'||cid::text,0));
  select * into anterior from public.cursos where id=cid for update;
  if found then
    if anterior.versao<>p_versao then
      raise exception using errcode='40001',message='Este curso foi atualizado em outra sessão. Suas alterações foram mantidas no editor.';
    end if;
  elsif p_versao<>0 or p_acao='excluir' then
    raise exception using errcode='40001',message='O curso não existe mais ou foi alterado. Suas alterações foram mantidas no editor.';
  end if;

  if p_acao='salvar' then
    if jsonb_typeof(p_curso->'modulos') is distinct from 'array' or nullif(btrim(p_curso->>'titulo'),'') is null then
      raise exception using errcode='22023',message='Título ou estrutura do curso inválidos.';
    end if;
    if jsonb_typeof(coalesce(p_removidos,'{}')) is distinct from 'object' then
      raise exception using errcode='22023',message='Lista de remoções inválida.';
    end if;
    select coalesce(array_agg(x::uuid),'{}') into rm_mods from jsonb_array_elements_text(coalesce(p_removidos->'modulos','[]')) x;
    select coalesce(array_agg(x::uuid),'{}') into rm_aulas from jsonb_array_elements_text(coalesce(p_removidos->'aulas','[]')) x;
    select coalesce(array_agg(x::uuid),'{}') into rm_mats from jsonb_array_elements_text(coalesce(p_removidos->'materiais','[]')) x;
    for m in select * from jsonb_array_elements(p_curso->'modulos') loop
      mid:=(m->>'id')::uuid;
      if mid is null or mid=any(mods) or jsonb_typeof(m->'aulas') is distinct from 'array' then raise exception using errcode='22023',message='Módulo incompleto ou repetido.'; end if;
      mods:=array_append(mods,mid);
      if exists(select 1 from public.modulos where id=mid and curso_id<>cid) then raise exception using errcode='22023',message='O módulo pertence a outro curso.'; end if;
      for a in select * from jsonb_array_elements(m->'aulas') loop
        aid:=(a->>'id')::uuid;
        if aid is null or aid=any(aulas) or jsonb_typeof(a->'materiais') is distinct from 'array' then raise exception using errcode='22023',message='Aula incompleta ou repetida.'; end if;
        aulas:=array_append(aulas,aid);
        if exists(select 1 from public.aulas au join public.modulos mo on mo.id=au.modulo_id where au.id=aid and mo.curso_id<>cid) then raise exception using errcode='22023',message='A aula pertence a outro curso.'; end if;
        for p in select * from jsonb_array_elements(a->'materiais') loop
          pid:=(p->>'id')::uuid;
          if pid is null or pid=any(mats) or nullif(p->>'caminho','') is null then raise exception using errcode='22023',message='Material incompleto ou repetido.'; end if;
          mats:=array_append(mats,pid);
          if exists(select 1 from public.materiais ma join public.aulas au on au.id=ma.aula_id join public.modulos mo on mo.id=au.modulo_id where ma.id=pid and (mo.curso_id<>cid or ma.caminho<>p->>'caminho')) then raise exception using errcode='22023',message='O material não corresponde ao curso.'; end if;
        end loop;
      end loop;
    end loop;
    -- Ausência no formulário nunca significa autorização para apagar.
    if exists(select 1 from public.modulos where curso_id=cid and not(id=any(mods)) and not(id=any(rm_mods)))
    or exists(select 1 from public.aulas au join public.modulos mo on mo.id=au.modulo_id where mo.curso_id=cid and not(au.id=any(aulas)) and not(au.id=any(rm_aulas)) and not(mo.id=any(rm_mods)))
    or exists(select 1 from public.materiais ma join public.aulas au on au.id=ma.aula_id join public.modulos mo on mo.id=au.modulo_id where mo.curso_id=cid and not(ma.id=any(mats)) and not(ma.id=any(rm_mats)) and not(au.id=any(rm_aulas)) and not(mo.id=any(rm_mods))) then
      raise exception using errcode='22023',message='Há conteúdo ausente sem confirmação de remoção. Nenhuma alteração foi salva.';
    end if;
    if exists(select 1 from unnest(rm_mods) x where x=any(mods) or not exists(select 1 from public.modulos where id=x and curso_id=cid))
    or exists(select 1 from unnest(rm_aulas) x where x=any(aulas) or not exists(select 1 from public.aulas au join public.modulos mo on mo.id=au.modulo_id where au.id=x and mo.curso_id=cid))
    or exists(select 1 from unnest(rm_mats) x where x=any(mats) or not exists(select 1 from public.materiais ma join public.aulas au on au.id=ma.aula_id join public.modulos mo on mo.id=au.modulo_id where ma.id=x and mo.curso_id=cid)) then
      raise exception using errcode='22023',message='Lista de remoções não corresponde ao curso.';
    end if;
  end if;

  -- Só se tornam elegíveis para limpeza quando a transação inteira confirmar.
  insert into public.arquivos_curso_pendentes(bucket,caminho,disponivel_em)
    select 'materiais',ma.caminho,now() from public.materiais ma join public.aulas au on au.id=ma.aula_id join public.modulos mo on mo.id=au.modulo_id
    where mo.curso_id=cid and (p_acao='excluir' or not(ma.id=any(mats)))
    on conflict(bucket,caminho) do update set disponivel_em=excluded.disponivel_em;
  if anterior.capa_url<>'' and (p_acao='excluir' or anterior.capa_url is distinct from p_curso->>'capa_url') and position('/storage/v1/object/public/capas/' in anterior.capa_url)>0 then
    capaanterior:=split_part(anterior.capa_url,'/storage/v1/object/public/capas/',2);
    insert into public.arquivos_curso_pendentes(bucket,caminho,disponivel_em) values('capas',capaanterior,now()) on conflict(bucket,caminho) do update set disponivel_em=excluded.disponivel_em;
  end if;
  if p_acao='excluir' then
    delete from public.cursos where id=cid;
    resultado:=jsonb_build_object('ok',true,'excluido',true,'id',cid);
  else
    insert into public.cursos(id,titulo,subtitulo,categoria,nivel,descricao,capa_emoji,capa_url,tipo_acesso,url_vendas)
    values(cid,p_curso->>'titulo',coalesce(p_curso->>'subtitulo',''),coalesce(p_curso->>'categoria',''),coalesce(p_curso->>'nivel','Básico'),coalesce(p_curso->>'descricao',''),coalesce(p_curso->>'capa_emoji','🩺'),coalesce(p_curso->>'capa_url',''),coalesce(p_curso->>'tipo_acesso','pago'),coalesce(p_curso->>'url_vendas',''))
    on conflict(id) do update set titulo=excluded.titulo,subtitulo=excluded.subtitulo,categoria=excluded.categoria,nivel=excluded.nivel,descricao=excluded.descricao,capa_emoji=excluded.capa_emoji,capa_url=excluded.capa_url,tipo_acesso=excluded.tipo_acesso,url_vendas=excluded.url_vendas;
    for m in select * from jsonb_array_elements(p_curso->'modulos') loop
      mid:=(m->>'id')::uuid;
      insert into public.modulos(id,curso_id,titulo,ordem) values(mid,cid,m->>'titulo',(m->>'ordem')::integer)
      on conflict(id) do update set titulo=excluded.titulo,ordem=excluded.ordem
      where (public.modulos.titulo,public.modulos.ordem) is distinct from (excluded.titulo,excluded.ordem);
      for a in select * from jsonb_array_elements(m->'aulas') loop
        aid:=(a->>'id')::uuid;
        insert into public.aulas(id,modulo_id,titulo,ordem,youtube_id,duracao,descricao) values(aid,mid,a->>'titulo',(a->>'ordem')::integer,coalesce(a->>'youtube_id',''),coalesce(a->>'duracao',''),coalesce(a->>'descricao',''))
        on conflict(id) do update set modulo_id=excluded.modulo_id,titulo=excluded.titulo,ordem=excluded.ordem,youtube_id=excluded.youtube_id,duracao=excluded.duracao,descricao=excluded.descricao
        where (public.aulas.modulo_id,public.aulas.titulo,public.aulas.ordem,public.aulas.youtube_id,public.aulas.duracao,public.aulas.descricao) is distinct from (excluded.modulo_id,excluded.titulo,excluded.ordem,excluded.youtube_id,excluded.duracao,excluded.descricao);
        for p in select * from jsonb_array_elements(a->'materiais') loop
          insert into public.materiais(id,aula_id,nome,caminho) values((p->>'id')::uuid,aid,p->>'nome',p->>'caminho')
          on conflict(id) do update set aula_id=excluded.aula_id,nome=excluded.nome
          where (public.materiais.aula_id,public.materiais.nome) is distinct from (excluded.aula_id,excluded.nome);
        end loop;
      end loop;
    end loop;
    delete from public.materiais where id=any(rm_mats);
    delete from public.aulas where id=any(rm_aulas);
    delete from public.modulos where id=any(rm_mods);
    select to_jsonb(c)||jsonb_build_object('modulos',coalesce((
      select jsonb_agg(to_jsonb(mo)||jsonb_build_object('aulas',coalesce((
        select jsonb_agg(to_jsonb(au)||jsonb_build_object('materiais',coalesce((select jsonb_agg(to_jsonb(ma) order by ma.criado_em,ma.id) from public.materiais ma where ma.aula_id=au.id),'[]')) order by au.ordem,au.id) from public.aulas au where au.modulo_id=mo.id
      ),'[]')) order by mo.ordem,mo.id) from public.modulos mo where mo.curso_id=c.id
    ),'[]')) into salvo from public.cursos c where c.id=cid;
    resultado:=jsonb_build_object('ok',true,'curso',salvo);
  end if;
  resultado:=resultado||jsonb_build_object('limpeza_pendente',exists(select 1 from public.arquivos_curso_pendentes where disponivel_em<=now()));
  insert into public.operacoes_curso(operacao_id,curso_id,admin_id,assinatura,requisicao,resultado) values(p_operacao,cid,p_admin,assinatura,p_curso->>'requisicao',resultado);
  return resultado;
end $$;
revoke all on function public.salvar_curso_atomico(jsonb,integer,jsonb,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.salvar_curso_atomico(jsonb,integer,jsonb,uuid,uuid,text) to service_role;

notify pgrst, 'reload schema';
