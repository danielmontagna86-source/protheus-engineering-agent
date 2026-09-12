# Conectividade multi-provider de IA — Especificação

**Status:** P0 em implementação; validação de contas reais pendente  
**Escopo:** Conexões opcionais, sem tornar IA requisito do produto

## Resultado

Permitir que uma pessoa use o Protheus Engineering Agent (PEA) com o host e a
forma de cobrança que já escolheu, sem transformar a extensão em IDE ou agente
com permissões amplas. O PEA preserva o seu diferencial — contexto Protheus,
CodeGraph, revisão e evidência — e pode entregá-lo por conexões oficiais ou
por API guardada no cofre do VS Code.

## Modos suportados

| Integração | Modo P0 | Dono da autenticação | Limite de segurança |
| --- | --- | --- | --- |
| Codex / ChatGPT | App Server oficial | Codex | leitura, aprovação por turno |
| Claude Code | cliente CLI oficial | Claude Code | plano/consulta, sem escrita automática |
| Gemini CLI | cliente CLI oficial | Gemini CLI | consulta somente após perfil seguro validado |
| Cline | host/CLI externo via MCP | Cline | PEA não lê estado ou chaves do Cline |
| OpenCode | host/servidor externo via MCP | OpenCode | PEA não lê `auth.json` nem automatiza OAuth |
| OpenRouter | HTTP API | PEA SecretStorage | chave nunca entra no projeto, log ou configuração |

“Login” significa o fluxo documentado e iniciado pelo cliente do fornecedor.
Não significa capturar cookies, reutilizar uma assinatura onde os termos não
permitem, ou apresentar uma API como se fosse login de conta.

## Requisitos

- **MPAI-001:** O registro de provedores deve declarar capacidades, modo de
  conexão, escopo de privacidade e estado sanitizado, sem credenciais.
- **MPAI-002:** A extensão deve distinguir visualmente *Login oficial*,
  *Chave API no VS Code* e *Host externo/MCP*.
- **MPAI-003:** Chaves de API devem usar exclusivamente `SecretStorage`; não
  podem ser persistidas em `.pea`, settings, variáveis de workspace, artefatos,
  logs, prompts de erro ou telemetria.
- **MPAI-004:** O contexto continua estruturado como dado não confiável,
  limitado e redigido pelo `createAiGateway`; cada envio exige `ai:invoke` e
  confirmação explícita.
- **MPAI-005:** Um provider CLI só pode ser executado por adaptador com formato
  estruturado, timeout, limites de saída e perfil sem aprovação automática.
- **MPAI-006:** Cline e OpenCode devem receber o PEA por MCP/configuração
  explícita do usuário. O PEA não deve ler, copiar ou escrever as pastas de
  autenticação desses produtos.
- **MPAI-007:** OpenRouter P0 usa sua API HTTP documentada com `Bearer` apenas
  em memória durante a chamada. Não há OAuth/login direto inventado.
- **MPAI-008:** Falhas de executável, protocolo, credencial, rede, schema,
  cancelamento ou limite devem falhar fechadas e manter o fluxo offline.
- **MPAI-009:** Nenhuma integração concede escrita, shell, build, banco,
  deployment ou ferramentas MCP em razão de resposta de modelo.
- **MPAI-010:** A documentação deve registrar as restrições de terceiros: em
  particular, PEA não deve incentivar Claude Pro/Max via plugins OpenCode.

## Critérios de aceite P0

1. Registro determinístico enumera Codex, Claude Code, Gemini, Cline,
   OpenCode e OpenRouter com modo, aviso e capacidades corretos.
2. OpenRouter envia somente o contrato OpenAI-compatible documentado, rejeita
   URL/modelo/saída inválidos, redige falhas e nunca registra a chave.
3. Uma chave é salva/removida apenas pelo SecretStorage da extensão e a UI não
   a revela após a entrada inicial.
4. Os clientes de host recebem uma configuração MCP de prévia; nenhuma pasta
   externa ou arquivo de credencial é alterado sem ação inequívoca do usuário.
5. Testes unitários/integração cobrem isolamento, schema, prompt injection,
   segredo em erro, timeout, cancelamento, manifesto/pt-BR e compatibilidade
   da ponte Codex existente.
6. Os testes empacotados de VSIX continuam sem exigir qualquer conta ou chave.

## Fora de escopo P0

- Executar login, OAuth ou instalação silenciosa de CLIs de terceiros.
- Ler sessões, cookies, arquivos de credenciais ou histórico de Codex, Claude,
  Gemini, Cline ou OpenCode.
- Usar Cline/OpenCode como passagem para burlar termos de assinatura de outro
  fornecedor.
- Prometer custo, disponibilidade, limite de contexto ou modelo específico.

## Gates externos antes de estabilidade

UAT separado por fornecedor, com conta do próprio usuário e evidência sem
segredos: instalar a CLI oficial, completar o login nativo, conexão no VS Code,
pergunta limitada, cancelamento, negação de contexto e verificação de que não
houve escrita. A publicação estável permanece bloqueada pelas demais evidências
de release, Marketplace e uso humano representativo.
