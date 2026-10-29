/* Controles visuais independentes da autenticação. Nunca persiste senhas. */
document.querySelectorAll('.login-revelar').forEach(button => {
  const input = document.getElementById(button.getAttribute('aria-controls'));
  button.addEventListener('click', () => {
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(mostrar));
    button.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  });
});

const titulos = {
  'aba-entrar': ['Bem-vindo de volta', 'Acesse seus cursos e continue aprendendo.'],
  'aba-cadastrar': ['Comece sua jornada', 'Crie sua conta para aprender com a AgoraMed.'],
  'link-esqueci': ['Recupere seu acesso', 'Receba um link para criar uma nova senha.'],
};
['aba-entrar', 'aba-cadastrar', 'link-esqueci', 'link-voltar-login', 'voltar-apos-confirmar'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    const [titulo, subtitulo] = titulos[id] || titulos['aba-entrar'];
    document.getElementById('login-boas-vindas').textContent = titulo;
    document.getElementById('login-descricao').textContent = subtitulo;
    ['aba-entrar', 'aba-cadastrar'].forEach(tab => {
      document.getElementById(tab).setAttribute('aria-selected', String(tab === id || (tab === 'aba-entrar' && id.includes('voltar'))));
    });
    document.querySelectorAll('.login-revelar').forEach(button => {
      document.getElementById(button.getAttribute('aria-controls')).type = 'password';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Mostrar senha');
    });
  });
});
