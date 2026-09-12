# Protocolo de aceitação — homologação AppServer

Este protocolo fecha o item `EV-006` somente em um laboratório Protheus
autorizado, isolado e identificável. Ele não é uma receita para obter software
TOTVS, nem autoriza registrar credenciais, fontes, RPO, logs brutos ou dados de
clientes no repositório.

## Pré-condições de admissão

- O responsável do ambiente declara que AppServer, RPO, DBAccess, licença,
  includes e dicionário são de origem legítima e podem ser usados no ensaio.
- O ambiente usa dados sintéticos, rede isolada e uma conta de teste com o menor
  privilégio necessário.
- A versão do AppServer, build, ambiente, banco/DBAccess, idioma, collation e
  hash do VSIX são anotados em uma evidência privada. Não registrar senhas,
  tokens, endereços públicos, paths pessoais, fontes proprietários ou conteúdo
  de tabelas.
- O operador conhece o procedimento de recuperação do RPO e libera uma janela
  sem concorrência. A documentação oficial do TDS exige servidor/ambiente
  conectado, autenticação quando aplicável, includes, acesso exclusivo ao RPO e
  token de compilação para `Function`/`Main Function`.

## Matriz obrigatória

| Caso | Ação no produto | Oráculo de aprovação | Não permitido |
|---|---|---|---|
| Fonte válido | Preparar e executar build supervisionado, com aprovação explícita | Evidência registra sucesso, duração, ambiente e hash; RPO recebe somente o artefato esperado | Inferir sucesso apenas pela porta aberta |
| Erro de sintaxe | Executar fixture inválida | Falha estruturada com arquivo/linha; sem falso sucesso | Gravar fonte de cliente no log público |
| Include ausente | Remover apenas o include da cópia descartável | Diagnóstico redigido e recuperável | Alterar includes reais |
| RPO bloqueado | Simular lock ou ocupação na janela | Operação falha/aguarda dentro do limite e não corrompe estado | Desconectar usuários sem autorização |
| Timeout/cancelamento | Induzir demora controlada e solicitar cancelamento | Estado final `cancelled`/`timed_out`, sem processo órfão e com evidência redigida | Matar serviços compartilhados |
| Permissão negada | Usar conta sem privilégio de build | Falha explícita, sem escalada silenciosa | Reutilizar credencial privilegiada |
| Banco/dicionário | Executar somente leitura por adapter autorizado | Consulta parametrizada/allowlist, origem e limitação rastreáveis | DDL, DML, dados pessoais ou dump |

## Execução TDS e extensão

1. Em perfil limpo do VS Code, instalar o VSIX exato e registrar o SHA-256.
2. Configurar o servidor pelo fluxo suportado da extensão TOTVS; não editar
   arquivos de credenciais para automatizar o ensaio.
3. Abrir a fixture local, CP1252 e LF, em um caminho curto sem caracteres
   especiais. Executar a ação TDS de compilar/recompilar com o fonte em foco.
4. Executar `Doctor`, indexação, review e a ação de build supervisionado do
   produto. Confirmar que o produto apenas orquestra/adiciona evidência: quem
   compila é o TDS/AppServer autorizado.
5. Rodar todos os casos da matriz, restaurar a cópia descartável e anexar à
   evidência privada somente hashes, versões, resultados redigidos e os IDs dos
   casos.

## Critérios de decisão

`EV-006 = VERIFIED` requer todos os casos aprovados no mesmo candidato, sob
uma identidade de laboratório autorizada, e revisão independente da evidência.
Uma imagem comunitária, uma resposta TCP, um WebApp carregado ou um teste de
contrato da extensão são evidência útil de laboratório, mas **não** substituem
esta homologação.

## Referências externas

- [TOTVS TDS: compilação](https://github.com/totvs/tds-vscode/blob/master/docs/compilation.md)
- [VS Code: testes de extensões](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
