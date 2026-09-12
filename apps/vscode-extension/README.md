# Protheus Engineering Agent para VS Code

Interface VS Code autônoma para engenharia ADVPL/TLPP baseada em evidências. O runtime determinístico e reutilizável acompanha o VSIX.

A prévia oferece uma Central de Engenharia nativa e comandos para indexar o workspace, revisar arquivo ativo e mudanças Git, registrar Project Memory e Journal estruturados, importar snapshots validados, supervisionar builds e verificar a saúde do runtime. Achados de revisão aparecem no painel nativo Problemas, enquanto relatórios completos e legíveis por máquina permanecem no canal Saída. A análise de domínio roda no runtime reutilizável empacotado; a extensão não substitui editor, explorer, terminal, Git, diff, compilação, depuração ou chat do VS Code.

Use o walkthrough integrado **Começar: revisão Protheus baseada em evidências** para validar o workspace, indexar fontes compatíveis e executar a primeira revisão.

Este é um projeto comunitário independente. Não é afiliado, patrocinado ou mantido pela TOTVS, pela marca Protheus ou pelo Hermes Agent.

## Padrões de segurança

- A extensão permanece desabilitada em workspaces não confiáveis.
- Os comandos normais não exigem Hermes, conta de modelo, Python, rede, Oracle, TDN ou AppServer.
- A compatibilidade experimental com Hermes é opcional e usa perfil isolado dentro do workspace.
- Integrações externas permanecem indisponíveis até receberem configuração e grants explícitos.
- Fontes, Skills, Rules, logs e resultados de integração são tratados como dados não confiáveis do projeto.

Código-fonte, documentação, limitações e o processo de segurança estão disponíveis em https://github.com/danielmontagna86-source/protheus-engineering-agent.
