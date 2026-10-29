const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function ambiente(){
 const mostrados=[];
 const origem={isConnected:true,focus(){this.recebeuFoco=true;}};
 class Elemento {
  constructor(tag){this.tag=tag;this.children=[];this.events={};this.returnValue='';}
  setAttribute(){}
  append(...items){this.children.push(...items);}
  addEventListener(name,fn){this.events[name]=fn;}
  showModal(){mostrados.push(this);}
  close(value=''){this.returnValue=value;this.events.close();}
  remove(){this.removido=true;}
 }
 const context={window:{},document:{activeElement:origem,createElement:t=>new Elemento(t),body:new Elemento('body')}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/dialogos.js'),'utf8'),context);
 return {ui:context.window.Dialogos,mostrados,origem};
}
const proximo=()=>new Promise(resolve=>setImmediate(resolve));
test('fechar uma confirmação sem aceitar devolve falso e restaura o foco',async()=>{
 const a=ambiente();const resposta=a.ui.confirmar('Excluir?');await proximo();
 const d=a.mostrados[0];assert.equal(d.children[2].children[0].autofocus,true);
 d.close();assert.equal(await resposta,false);assert.equal(d.removido,true);assert.equal(a.origem.recebeuFoco,true);
});
test('confirmações em fila exigem uma resposta própria para cada ação',async()=>{
 const a=ambiente();const primeira=a.ui.confirmar('Primeira');const segunda=a.ui.confirmar('Segunda');await proximo();
 assert.equal(a.mostrados.length,1);a.mostrados[0].close('confirmar');assert.equal(await primeira,true);await proximo();
 assert.equal(a.mostrados.length,2);a.mostrados[1].close('cancelar');assert.equal(await segunda,false);
});
test('mensagem é texto literal, sem interpretar HTML de nomes ou erros',async()=>{
 const a=ambiente();const texto='<img src=x onerror=alert(1)>';const resposta=a.ui.avisar(texto);await proximo();
 const d=a.mostrados[0];assert.equal(d.children[1].textContent,texto);assert.equal(d.children[1].innerHTML,undefined);
 assert.equal(d.children[2].children.length,1);d.close('confirmar');await resposta;
});
