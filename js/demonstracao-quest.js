'use strict';
(() => {
  const abrir = document.querySelector('#demo-abrir');
  const questao = document.querySelector('#demo-questao');
  const feedback = document.querySelector('#demo-feedback');
  const botoes = [...document.querySelectorAll('[data-demo-choice]')];
  if (!abrir || !questao || !feedback || !botoes.length) return;

  const correta = 'C';
  const devolutiva = 'O paciente com potássio de 5,3 mEq/L, doença renal crônica estável, ECG sem alterações, diurese preservada e valores semelhantes nos últimos meses apresenta a menor urgência relativa. A cronicidade e a estabilidade reduzem a necessidade de redução imediata, embora ainda exijam reavaliação e seguimento. Os demais cenários combinam hipercalemia grave, comprometimento elétrico ou risco de elevação rápida.';

  abrir.addEventListener('click', () => {
    questao.hidden = false;
    abrir.setAttribute('aria-expanded', 'true');
    abrir.hidden = true;
    window.AgoraFunil?.track('sample_open', 'demonstracao');
  });

  botoes.forEach((botao) => botao.addEventListener('click', () => {
    const escolha = botao.dataset.demoChoice;
    botoes.forEach((item) => {
      item.disabled = true;
      if (item.dataset.demoChoice === correta) item.classList.add('resposta-correta');
      if (item === botao && escolha !== correta) item.classList.add('escolhida-errada');
    });
    feedback.innerHTML = `<strong>${escolha === correta ? 'Isso. A alternativa C é a correta.' : 'Vamos revisar. A alternativa correta é C.'}</strong><span>${devolutiva}</span>`;
    feedback.hidden = false;
    window.AgoraFunil?.track('sample_answer', 'demonstracao');
  }));
})();
