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
- OpenRouter, Anthropic API e Gemini API usam chave guardada exclusivamente no SecretStorage do VS Code. O workspace recebe somente uma referência de segredo, o modelo e a rota limitada.
- Cline e OpenCode recebem apenas uma prévia MCP explícita. Claude Code e Gemini CLI permanecem no login oficial de seus clientes, sem runner direto do PEA até homologação específica.
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

## Conexões de IA e rotas

Execute **Protheus Engineering Agent: Configurar conexões de IA** e selecione um
provider de API. Informe a chave e o identificador do modelo. A extensão cria
uma rota de análise somente leitura com limites de contexto e resposta; não há
chave em configurações do workspace, `.pea`, logs, recibos ou VSIX.

Depois execute **Protheus Engineering Agent: Perguntar a provedor de IA**,
escolha a rota configurada, informe a pergunta e confirme o envio do contexto
Protheus limitado e redigido. Erros de credencial, policy, schema e
cancelamento falham fechados. Uma falha transitória só pode usar fallback que
tenha sido configurado e aprovado explicitamente.

| Provider/host | Estado na extensão |
| --- | --- |
| ChatGPT/Codex | Login oficial opcional via App Server |
| OpenRouter, Anthropic API, Gemini API | Conexão de API governada |
| Cline, OpenCode | Prévia MCP manual; PEA não lê autenticação externa |
| Claude Code, Gemini CLI | Interoperabilidade documentada; runner direto aguarda UAT |

O produto continua em prévia. Testes automatizados e de instalação do VSIX não
equivalem à homologação de conta, ambiente Protheus ou Marketplace. Consulte o
guia completo e a matriz UAT no repositório:
https://github.com/danielmontagna86-source/protheus-engineering-agent/blob/main/docs/provider-uat.md
