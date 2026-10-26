# PDFs de até 50 MB

Implementação preparada em 26/10/2026. Limite por arquivo: 50.000.000 bytes (50 MB decimais). Alvo solicitado: PDF de aproximadamente 30 MB.

O navegador confere extensão e assinatura PDF, pede autorização ao servidor e envia o arquivo bruto diretamente ao Storage privado. O progresso aparece no editor. O envio não publica o anexo: ainda é necessário salvar o curso. Falhas não retiram materiais existentes. As capas continuam no fluxo anterior.

A rota `admin/materiais` exige professor ativo, verifica o vínculo de aulas existentes e reserva um caminho novo, sem sobrescrita. A autorização do Storage dura duas horas. Um comprovante separado, assinado com chave derivada da chave de sessão, vincula o arquivo ao professor, curso, aula, nome, tamanho e caminho. Ele dura 18 horas e não funciona como cookie de login.

Ao salvar, o servidor confere o comprovante e lê somente os primeiros cinco bytes do objeto, verificando assinatura PDF, MIME e tamanho total. Somente metadados entram na transação existente. Proteção de versão, exclusões explícitas e repetição de solicitações são preservadas. PDFs existentes continuam com seus IDs e caminhos originais.

Para abrir um PDF, a rota de material confere a sessão e o direito de acesso ao curso antes de emitir um link privado de cinco minutos. A resposta redireciona ao Storage, evitando também o limite de tamanho das respostas Vercel. O link temporário é uma credencial compartilhável durante esses cinco minutos; o arquivo não se torna público.

Usa a fila de arquivos pendentes já existente: objetos sem vínculo ficam elegíveis para limpeza após 24 horas, nas próximas gravações que executarem limpeza. Não foi criado cron nem alterado o esquema, os alunos, aulas, permissões ou buckets. A reserva permanece também após sucesso; o limpador já verifica referência antes de remover qualquer objeto. As 18 horas do comprovante são menores que a janela de limpeza.

Envio padrão com URL assinada, sem biblioteca nova. Não retoma do ponto interrompido: em caso de falha, o professor seleciona novamente o arquivo. Arquivos já enviados e ainda não salvos precisam ser selecionados novamente se o editor for fechado ou se o comprovante expirar.

A inspeção do bucket real confirmou `public=false`, sem limite específico por bucket. O limite global não foi inspecionado nem alterado. A documentação do Supabase permite até 50 MB no plano Free; a confirmação do funcionamento na infraestrutura real exige um envio controlado após publicação. Os testes locais não medem rede, CORS ou limites da configuração de produção.

Verificações: testes automatizados de escopo/adulteração/expiração, ausência de autenticação, arquivo ausente, tamanho e MIME incorretos, dados fora do JSON, progresso, falha de envio e link privado de download. Na prévia local, 29.999.987 bytes atravessaram o upload; o salvamento recebeu 1.156 bytes e a verificação leu 5 bytes. Curso fictício, sem alteração de dados reais.

Referências:
- https://vercel.com/docs/functions/limitations
- https://supabase.com/docs/guides/storage/uploads/file-limits
- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl
