/* Remoções nascem somente das ações explícitas do professor, nunca de uma lista incompleta. */
const EditorCurso = (() => {
  function criar(curso) {
    const ed=JSON.parse(JSON.stringify(curso));
    const originais={modulos:new Set(),aulas:new Set(),materiais:new Set()};
    const removidos={modulos:new Set(),aulas:new Set(),materiais:new Set()};
    for(const m of ed.modulos){originais.modulos.add(m.id);for(const a of m.aulas){originais.aulas.add(a.id);for(const p of a.pdfs)originais.materiais.add(p.id);}}
    const estado={curso:ed,alterado:false,
      marcar(){estado.alterado=true;},
      registrar(tipo,id){if(originais[tipo].has(id))removidos[tipo].add(id);estado.marcar();},
      removerModulo(i){estado.registrar('modulos',ed.modulos[i].id);ed.modulos.splice(i,1);},
      removerAula(i,j){estado.registrar('aulas',ed.modulos[i].aulas[j].id);ed.modulos[i].aulas.splice(j,1);},
      removerMaterial(i,j,k){estado.registrar('materiais',ed.modulos[i].aulas[j].pdfs[k].id);ed.modulos[i].aulas[j].pdfs.splice(k,1);},
      remocoes(){return Object.fromEntries(Object.entries(removidos).map(([k,v])=>[k,Array.from(v)]));},
      resumo(){const r=estado.remocoes();return `Remover ${r.modulos.length} módulo(s), ${r.aulas.length} aula(s) e ${r.materiais.length} PDF(s)? Módulos e aulas removidos levam seus materiais, comentários e progresso associados.`;},
      temRemocoes(){return Object.values(removidos).some(v=>v.size);}
    };
    return estado;
  }
  return {criar};
})();
