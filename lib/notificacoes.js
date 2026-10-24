/* Credenciais de envio ficam somente no servidor. Destinatário autorizado pelo professor. */
'use strict';
const { postgrest, APP_URL } = require('./api');
const DESTINATARIO = 'drandersongleryston@gmail.com';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function configurado() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS && EMAIL.test(process.env.SMTP_FROM || process.env.SMTP_USER));
}
function transporte() {
  const nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000,
    disableFileAccess: true, disableUrlAccess: true,
  });
}
function mensagem(text, teste = false, uid) {
  return {
    from: { name: 'AgoraMed', address: process.env.SMTP_FROM || process.env.SMTP_USER },
    to: DESTINATARIO,
    subject: teste ? 'AgoraMed — teste dos avisos de cadastro' : 'AgoraMed — novo cadastro aguardando liberação',
    text,
    ...(uid ? { messageId: `<cadastro-${uid}@agoramed.vercel.app>` } : {}),
  };
}
async function enviarTeste() {
  if (!configurado()) return { ok: false, erro: 'Envio de e-mails aguardando ativação.' };
  try {
    const info = await transporte().sendMail(mensagem('Os avisos de novos cadastros da AgoraMed estão configurados para este endereço.\n\nPainel: ' + (APP_URL || 'https://agoramed.vercel.app') + '/admin.html', true));
    if (!info.accepted || !info.accepted.some(e => String(e).toLowerCase() === DESTINATARIO)) throw Error('Destinatário recusado.');
    return { ok: true, msg: 'E-mail de teste aceito pelo serviço de envio. Confira também o spam.' };
  } catch (e) {
    return { ok: false, erro: 'Não foi possível enviar o teste. Verifique a configuração do remetente.' };
  }
}
function filtroDisponivel() {
  const limite = encodeURIComponent(new Date(Date.now() - 5 * 60 * 1000).toISOString());
  return `enviado_em=is.null&or=(ultima_tentativa_em.is.null,ultima_tentativa_em.lt.${limite})`;
}
async function enviarAvisoCadastro(uid) {
  if (!configurado()) return { ok: false, pendente: true };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(uid))) return { ok: false };
  const alvo = '/avisos_cadastro?usuario_id=eq.' + encodeURIComponent(uid);
  try {
    /* PATCH condicional é a trava: apenas um trabalhador recebe a linha para enviar. */
    const trava = await postgrest(alvo + '&' + filtroDisponivel(), {
      metodo: 'PATCH', servico: true, corpo: { ultima_tentativa_em: new Date().toISOString(), ultimo_erro: null },
    });
    if (!trava.ok || !Array.isArray(trava.dados)) return { ok: false, pendente: true };
    if (!trava.dados.length) return { ok: true, ignorado: true };
    const rp = await postgrest(`/perfis?id=eq.${uid}&select=nome,email&limit=1`, { servico: true });
    const perfil = rp.ok && Array.isArray(rp.dados) && rp.dados[0];
    if (!perfil) throw Object.assign(new Error('Perfil indisponível.'), { code: 'PERFIL_INDISPONIVEL' });
    const limpar = valor => String(valor || '').replace(/[\r\n]/g, ' ').slice(0, 254);
    const text = `Novo cadastro na AgoraMed.\n\nNome: ${limpar(perfil.nome)}\nE-mail: ${limpar(perfil.email)}\n\nAcesse o painel para conferir o cadastro e liberar os cursos:\n${APP_URL || 'https://agoramed.vercel.app'}/admin.html`;
    const info = await transporte().sendMail(mensagem(text, false, uid));
    if (!info.accepted || !info.accepted.some(e => String(e).toLowerCase() === DESTINATARIO)) throw Object.assign(new Error('Destinatário recusado.'), { code: 'DESTINATARIO_RECUSADO' });
    const salvo = await postgrest(alvo, { metodo: 'PATCH', servico: true, corpo: { enviado_em: new Date().toISOString(), ultimo_erro: null } });
    return { ok: !!salvo.ok, pendente: !salvo.ok };
  } catch (e) {
    const codigo = /^[A-Z_]{1,40}$/.test(e.code || '') ? e.code : 'FALHA_ENVIO';
    await postgrest(alvo, { metodo: 'PATCH', servico: true, corpo: { ultimo_erro: codigo } }).catch(() => {});
    return { ok: false, pendente: true };
  }
}
async function processarPendentes() {
  if (!configurado()) return { ok: false, erro: 'Envio de e-mails aguardando ativação.' };
  const r = await postgrest('/avisos_cadastro?' + filtroDisponivel() + '&select=usuario_id&order=criado_em.asc&limit=3', { servico: true });
  if (!r.ok || !Array.isArray(r.dados)) return { ok: false, erro: 'Não foi possível consultar os avisos pendentes.' };
  const resultados = await Promise.all(r.dados.map(x => enviarAvisoCadastro(x.usuario_id)));
  return { ok: resultados.every(x => x.ok), processados: resultados.filter(x => x.ok && !x.ignorado).length, pendentes: resultados.filter(x => !x.ok).length };
}
module.exports = { DESTINATARIO, configurado, enviarTeste, enviarAvisoCadastro, processarPendentes };
