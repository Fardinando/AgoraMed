'use strict';
(()=>{const criar=document.querySelector('#criar'),consultar=document.querySelector('#consultar'),estado=document.querySelector('#estado');let id=sessionStorage.getItem('agoramed-pedido-teste');consultar.hidden=!id;
async function chamar(url,op){const r=await fetch(url,{credentials:'same-origin',...op});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.erro||'Não foi possível conferir o pagamento.');return d;}
criar.onclick=async()=>{criar.disabled=true;estado.textContent='Preparando checkout de teste…';try{const d=await chamar('/api/pagamento/teste',{method:'POST'});id=d.id;sessionStorage.setItem('agoramed-pedido-teste',id);const u=new URL(d.url);if(u.origin!=='https://www.mercadopago.com.br')throw Error('Checkout inválido.');location.assign(u.href);}catch(e){estado.textContent=e.message;criar.disabled=false;}};
consultar.onclick=async()=>{consultar.disabled=true;try{const d=await chamar('/api/pagamento/teste?id='+encodeURIComponent(id));estado.textContent='Situação do pagamento de teste: '+d.estado+'. Nenhum acesso real foi liberado.';}catch(e){estado.textContent=e.message;}finally{consultar.disabled=false;}};
})();
