/* Confirmações assíncronas: nenhuma ação é autorizada antes da resposta. */
const Dialogos = (() => {
  let fila = Promise.resolve();
  let sequencia = 0;
  function abrir(texto, confirmar) {
    return new Promise(resolve => {
      const origem = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = 'ag-dialogo';
      const id = `ag-dialogo-${++sequencia}`;
      dialog.setAttribute('aria-labelledby', id + '-titulo');
      dialog.setAttribute('aria-describedby', id + '-texto');
      const titulo = document.createElement('h2');
      titulo.id = id + '-titulo'; titulo.textContent = confirmar ? 'Confirme para continuar' : 'Aviso da plataforma';
      const mensagem = document.createElement('p');
      mensagem.id = id + '-texto'; mensagem.textContent = String(texto);
      const acoes = document.createElement('div'); acoes.className = 'ag-dialogo-acoes';
      if (confirmar) {
        const cancelar = document.createElement('button');
        cancelar.type = 'button'; cancelar.textContent = 'Cancelar'; cancelar.autofocus = true;
        cancelar.addEventListener('click', () => dialog.close('cancelar'));
        acoes.append(cancelar);
      }
      const aceitar = document.createElement('button');
      aceitar.type = 'button'; aceitar.className = 'ag-dialogo-confirmar';
      aceitar.textContent = confirmar ? 'Confirmar' : 'Entendi'; aceitar.autofocus = !confirmar;
      aceitar.addEventListener('click', () => dialog.close('confirmar'));
      acoes.append(aceitar);
      dialog.append(titulo, mensagem, acoes);
      dialog.addEventListener('close', () => {
        const aceitou = dialog.returnValue === 'confirmar';
        dialog.remove();
        if (origem?.isConnected) origem.focus({ preventScroll: true });
        resolve(aceitou);
      }, { once: true });
      document.body.append(dialog);
      dialog.showModal();
    });
  }
  function pedir(texto, confirmar) {
    const pedido = fila.then(() => abrir(texto, confirmar));
    fila = pedido.catch(() => {});
    return pedido;
  }
  return { confirmar: texto => pedir(texto, true), avisar: texto => pedir(texto, false) };
})();
window.Dialogos = Dialogos;
