# Venda de Hipercalemia — preparação da oferta

Oferta definida: Tratamento da Hipercalemia, R$ 39,70, pagamento único, acesso por 12 meses a partir da aprovação verificada.

O editor oferece três modos: gratuito, pago com liberação manual e pago com liberação automática pelo Mercado Pago. Neste estágio o último modo salva apenas a configuração da oferta. `cursos.tipo_acesso` permanece `pago`; `config_pagamento` registra provedor, preço em centavos, acesso em meses e `vendas_ativas: false`. Não cria cobrança, matrícula, assinatura ou prazo de acesso efetivo. O checkout ainda precisa ser implementado e conectado.

A configuração é salva na mesma transação da estrutura do curso, com as proteções de versão e repetição existentes. A restrição no banco impede marcar vendas como ativas nesta etapa. Edições legadas não apagam uma oferta sem conhecer os campos novos. Não se alteram matrículas e progresso de alunos ao configurar a oferta.

## Etapa seguinte

1. Concluir o cadastro do curso e vincular a oferta ao seu ID.
2. Criar/configurar a aplicação de Checkout Pro na conta Mercado Pago já existente, começando em testes. Credenciais privadas somente no servidor/gerenciador de variáveis; não enviar valores no chat.
3. Implementar pedidos vinculados ao aluno autenticado e preço obtido exclusivamente no servidor.
4. Criar preferência de pagamento, validar notificações assinadas e confirmar os dados diretamente na API do provedor. Conferir conta recebedora, ambiente, moeda, valor, referência do pedido e situação final.
5. Confirmar pagamento e conceder acesso com data final em transação idempotente. Notificações repetidas não renovam o prazo. Tratar reembolso/contestação sem remover compras independentes ou acessos concedidos por outro motivo.
6. Aplicar a data de expiração em todas as autorizações do curso, vídeos e materiais, inclusive no catálogo e regras RLS aplicáveis. Preservar compras avulsas quando houver futuras assinaturas.
7. Testar Pix pendente/expirado, aprovação, retorno sem pagamento, reenvio de notificações, compras duplicadas, expiração de acesso e reembolso. Só então ativar vendas.

Documentação oficial: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/create-application e https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications.

## Homologação local em 9/11/2026 — ainda sem publicação

Nova oferta de homologação aprovada: R$ 97,00. A oferta pública no banco permanece R$ 39,70 e vendas_ativas=false. O endpoint exclusivamente administrativo de sandbox usa 9700 centavos definidos no servidor, não dados do navegador. Não utilizar essa rota para vendas reais.

Implementada confirmação transacional de pedidos simulados, com bloqueio por linha, preservação da data inicial e final nos reprocessamentos e rejeição de atualizações antigas. Reembolsos e contestações invalidam somente o acesso simulado. Nenhuma matrícula real é criada, removida ou alterada.

Webhook de homologação: POST /api/pagamento/webhook-teste?data.id=ORDTST... ; segredo esperado MERCADO_PAGO_WEBHOOK_SECRET_TEST. Assinatura HMAC validada antes de consultar a order diretamente no provedor. Conta, aplicação, referência, moeda e total conferidos no backend. Não configurar recebimento até existir URL de homologação e segredo configurado.

Testes locais: 211 aprovados. Ainda pendentes: publicação em ambiente de homologação autorizado, segredo e entrega real do webhook, compra com conta de teste, fluxo de compra autenticado para alunos, integração dos direitos pagos reais à autorização de todas as rotas, RLS e catálogo. A implementação de sandbox NÃO conclui a integração comercial.
