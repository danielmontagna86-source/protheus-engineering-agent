# Plano executável — conectividade de IA multi-provider

## Objetivo

Entregar um caminho neutro de host para Codex, Claude Code, Gemini, Cline,
OpenCode e OpenRouter, sem tornar nenhum deles obrigatório e sem armazenar ou
coletar credenciais de terceiros.

## Implementação P0

1. Criar `packages/ai-providers` com descritores sanitizados e adaptador HTTP
   OpenRouter; escrever os testes antes do código.
2. Integrar o registro à extensão: um comando para selecionar/conferir o modo
   de conexão e uma entrada explícita de chave somente para OpenRouter, usando
   `SecretStorage`.
3. Gerar a configuração MCP do PEA como prévia copiável para Cline/OpenCode;
   não alterar automaticamente configurações ou autenticação externa.
4. Manter a ponte Codex existente e documentar os fluxos oficiais de Claude,
   Gemini, Cline e OpenCode.
5. Executar testes de IA, regressão, structural check, pacote, audit e smoke
   instalado. Registrar a UAT real como gate externo por fornecedor.

## Matriz real de homologação posterior

| Provider | Ação humana oficial | Prova necessária |
| --- | --- | --- |
| Codex | Login App Server | status sanitizado + turno limitado |
| Claude Code | `claude` login/configuração própria | `-p` JSON read-only em sandbox de teste |
| Gemini | login Google ou API/Vertex próprio | headless JSON sem escrita |
| Cline | `cline auth`; adicionar MCP | tools PEA visíveis; nenhuma autoaprovação PEA |
| OpenCode | `/connect` ou autenticação OpenCode | MCP/servidor local saudável; sem `auth.json` lido |
| OpenRouter | chave criada pelo usuário | request limitado e revogação da chave |

## Não automatizar

Não instalar CLIs, não abrir fluxo de conta sem interação, não executar
OAuth, não colher tokens, não reutilizar assinaturas por intermédio de outro
host e não afirmar compatibilidade sem a UAT da versão exata.
