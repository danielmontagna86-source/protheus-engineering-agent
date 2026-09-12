# Protheus Engineering Agent para VS Code

Interface VS Code autônoma para engenharia ADVPL/TLPP baseada em evidências. O runtime determinístico e reutilizável acompanha o VSIX.

A prévia oferece uma Central de Engenharia nativa e comandos para indexar o workspace, revisar arquivo ativo e mudanças Git, registrar Project Memory e Journal estruturados, importar snapshots validados, supervisionar builds e verificar a saúde do runtime. Achados de revisão aparecem no painel nativo Problemas, enquanto relatórios completos e legíveis por máquina permanecem no canal Saída. A análise de domínio roda no runtime reutilizável empacotado; a extensão não substitui editor, explorer, terminal, Git, diff, compilação, depuração ou chat do VS Code.

Use o walkthrough integrado **Começar: revisão Protheus baseada em evidências** para validar o workspace, indexar fontes compatíveis e executar a primeira revisão.

Este é um projeto comunitário independente. Não é afiliado, patrocinado ou mantido pela TOTVS, pela marca Protheus ou pelo Hermes Agent.

## Padrões de segurança

- A extensão permanece desabilitada em workspaces não confiáveis.
- Os comandos normais não exigem Hermes, conta de modelo, Python, rede, Oracle, TDN ou AppServer.
- A compatibilidade experimental com Hermes é opcional e usa perfil isolado dentro do workspace.
- A conexão opcional com ChatGPT usa somente o login oficial do Codex App Server. A extensão não recebe nem armazena token, cookie ou chave da conta; o contexto é limitado, mascarado, somente leitura e enviado após confirmação.
- Integrações externas permanecem indisponíveis até receberem configuração e grants explícitos.
- Fontes, Skills, Rules, logs e resultados de integração são tratados como dados não confiáveis do projeto.

Código-fonte, documentação, limitações e o processo de segurança estão disponíveis em https://github.com/danielmontagna86-source/protheus-engineering-agent.

## ChatGPT opcional, sem chave de API

Com o Codex App Server oficial instalado, execute **Protheus Engineering Agent:
Conectar ChatGPT via Codex** no VS Code e conclua o login no navegador. Em
seguida, use **Protheus Engineering Agent: Perguntar ao Codex com contexto do
projeto**. A extensão valida o protocolo antes de usar o executável, portanto
não assume que qualquer programa chamado `codex` seja o cliente oficial.

Se o executável oficial não estiver no `PATH`, defina
`PEA_CODEX_APP_SERVER_COMMAND` com seu caminho antes de abrir o VS Code. O
recurso é opcional: sem App Server compatível, todos os fluxos offline continuam
funcionando. Plano, limites, modelos e custo dependem da conta; não há promessa
de uso ilimitado ou menor custo.
