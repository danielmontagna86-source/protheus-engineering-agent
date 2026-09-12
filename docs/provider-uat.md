# Homologação por fornecedor de IA

**Estado:** roteiro de homologação externa. Não é evidência de aprovação.

## Princípios

- Use uma conta de teste pertencente à pessoa que executa a homologação.
- Nunca cole chave, token, cookie, URL autenticada, prompt ou resposta no
  relatório. Registre somente data, versão, provider, modelo, hash do VSIX e
  resultado sanitizado.
- Execute em workspace de amostra sem dados de cliente. Confirme que a extensão
  não gravou arquivos de credencial no workspace e que `.pea/ai-connections.json`
  contém apenas referências, modelo e rota.
- Reprove a rota se ocorrer escrita, shell, banco, build, deployment, acesso a
  arquivo de autenticação externo ou fallback sem aprovação explícita.

## Matriz mínima

| Integração | Caso de aprovação | Caso de negação | Evidência esperada |
| --- | --- | --- | --- |
| ChatGPT/Codex | Login pelo App Server e pergunta limitada | cancelamento e ausência do App Server | status sem dados de conta |
| OpenRouter API | conexão, rota de análise e JSON válido | chave revogada, 429 e saída não JSON | recibo sanitizado, sem chave |
| Anthropic API | conexão, rota de análise e JSON válido | 401, cancelamento e saída não JSON | recibo sanitizado, sem chave |
| Gemini API | conexão, rota de análise e JSON válido | 403, cancelamento e saída não JSON | recibo sanitizado, sem chave |
| Claude Code | login no cliente oficial, sem execução pelo PEA | tentativa de execução direta pelo PEA | aviso de interoperabilidade, sem credencial |
| Gemini CLI | login no cliente oficial, sem execução pelo PEA | tentativa de execução direta pelo PEA | aviso de interoperabilidade, sem credencial |
| Cline | importar manualmente a prévia MCP | procurar ou editar autenticação Cline | preview MCP sem segredos |
| OpenCode | importar manualmente a prévia MCP | procurar `auth.json` ou plugin Pro/Max | preview MCP sem segredos |

## Saída obrigatória por execução

1. Hash SHA-256 do VSIX e commit Git exato.
2. Versão do VS Code, sistema operacional e versão oficial do host, quando houver.
3. Resultado de conexão, consulta limitada, negação, cancelamento e revogação.
4. Confirmação de inspeção de logs e manifesto sem segredo.
5. Identidade do revisor ou papel responsável e decisão `aprovado`, `reprovado`
   ou `bloqueado`.

Sem todos os itens aplicáveis, a integração permanece **não homologada** e não
autoriza publicação estável nem alegação de suporte de produção.
