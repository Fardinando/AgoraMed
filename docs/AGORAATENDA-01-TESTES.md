# AgoraAtenda 01 — cenários de verificação

Protótipo local do atendimento de hipercalemia grave. Executar na raiz do repositório:

```sh
node tools/agoraatenda01.test.cjs
```

## Cenários incluídos

1. Conduta de referência completa: 100/100 sem omissões críticas.
2. Cálcio registrado após 15 minutos: o relógio não altera o paciente sem evento clínico.
3. Dose de cálcio fora da opção de referência: bloqueada antes da administração, sem mudança clínica.
4. Insulina sem prevenção de hipoglicemia: ordem retida antes da administração.
5. Salbutamol como única intervenção: crédito restrito e medidas críticas continuam ausentes.
6. Ausência de estratégia de remoção definitiva: omissão crítica explicitada.
7. Potássio de rebote: só aparece quando inserido como resultado de reavaliação; não é calculado pelo relógio.
8. Variação defensável sem salbutamol: plano com proteção, shift, remoção e monitorização atinge 94/100 sem omissão crítica.
9. Sequência guiada mantém a ordem das decisões, ordens e reavaliações.
10. Escolha inicial inadequada mostra correção sem executar intervenção automaticamente.
11. Resposta programada ao cálcio melhora ECG, mantendo o potássio inalterado.
12. Resultado do controle de 4 h muda somente após o início registrado da remoção.

O fluxo do aluno é faseado: prioridade → prescrição/preparo/administração do cálcio → resposta do ECG → investigação da causa → insulina/glicose → adjuvante opcional → controles seriados → remoção/nefrologia → resposta → destino e relatório. A próxima etapa só aparece após o aluno responder ou registrar a ação requerida.

Os valores de resposta em 10 min, 60 min e 4 h são resultados fixos e ramificados deste caso fictício. Eles não são calculados por fórmula nem devem ser interpretados como resposta esperada para pacientes reais.

## Limites do modelo

- Os resultados acima verificam regras determinísticas e estados do protótipo, não desfechos de pacientes.
- Não existe farmacodinâmica por fórmula, deterioração por tempo ou disparo automático de parada cardíaca.
- A tela final mostra a pontuação apenas após o aluno encerrar o atendimento. A sugestão de 80 pontos não equivale a certificação.
- Os números e regras clínicas são preliminares e exigem revisão médica antes de uso educacional avaliativo.
