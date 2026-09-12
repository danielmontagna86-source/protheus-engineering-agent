# Conectividade multi-provider de IA — Tarefas

| ID | Entrega | Dependência | Evidência |
| --- | --- | --- | --- |
| MPAI-01 | Registro, validação e testes de contrato dos seis providers | — | Testes inicialmente vermelhos, depois verdes |
| MPAI-02 | Transport OpenRouter seguro e testes de API | MPAI-01 | Nenhuma chave em saída/erro; schema e timeout cobertos |
| MPAI-03 | Comando VS Code de conexões e SecretStorage | MPAI-01 | Manifesto/l10n/teste de UI falsificada |
| MPAI-04 | Prévia MCP para Cline/OpenCode e documentação de login oficial | MPAI-03 | Não toca auth externa; snapshot da configuração |
| MPAI-05 | Atualizar documentação, roadmap, limitações e UAT matrix | MPAI-01 | Português e fonte oficial citada |
| MPAI-06 | Regressão completa, check, pacote e smoke VSIX | MPAI-02..05 | Logs/artefatos da candidata exata |
| MPAI-07 | UAT oficial Codex/Claude/Gemini/Cline/OpenCode/OpenRouter | MPAI-06 | Evidência externa sem segredos; pendente de contas/hosts |

## Fases posteriores

- **P1:** Claude Code runner somente leitura com flags e versão oficial
  verificados; Gemini runner apenas depois de perfil de policy sem mutação;
  OpenCode server adapter versionado; discovery de modelos e métricas locais
  opt-in sem conteúdo.
- **P2:** administrações de equipe, SSO/controles corporativos e piloto de
  efetividade; não antes de UAT, termos e consentimento aprovados.
