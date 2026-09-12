# Design — descoberta pública e consistência de marca

## Decisão

O PEA não tentará vencer projetos horizontais pela quantidade de modelos, edição autônoma ou uma segunda IDE. O produto será apresentado como uma camada VS Code-first que torna mudanças ADVPL/TLPP mais compreensíveis e auditáveis: CodeGraph, revisão determinística, contexto de projeto e integrações governadas. MCP e provedores são interoperabilidade opcional, não a identidade principal.

```text
Descoberta no GitHub / Marketplace
             |
     promessa curta e verificável
             v
VSIX + walkthrough offline de cinco minutos
             |
     CodeGraph -> review -> Problems/evidência
             v
TDS e host de IA escolhidos pelo usuário
```

## Mudanças

| Superfície | Decisão | Limite |
| --- | --- | --- |
| About do GitHub | descrição pt-BR curta, independente e centrada em ADVPL/TLPP | não criar homepage fictícia |
| Manifesto VS Code | acrescentar `Programming Languages` | manter preview e as categorias de lint/teste |
| README | destacar instalação pelo GitHub preview e primeiro valor offline | não dizer que Marketplace existe |
| Documentação de lançamento | substituir o snapshot privado obsoleto pela evidência pública datada | não fechar gates de publisher, legal, acessibilidade ou piloto |
| Benchmark | registrar comparação e lacunas por evidência | estrelas são apenas sinal de descoberta |
| Testes | testar categorias e frases que caracterizam o estado vivo | a verificação de configuração remota continua uma etapa externa datada |

## Riscos tratados

- **Marca de terceiro:** manter o nome descritivo e o disclaimer, sem simbolismo TOTVS; revisão jurídica continua obrigatória antes de exploração comercial relevante.
- **Promessa excessiva:** mensagens enfatizam fluxos offline que têm prova; AppServer, bancos, Marketplace e contas de IA permanecem delimitados.
- **Documentação envelhecida:** registrar data, commit/referência e separar histórico de estado observado.
- **Comunidade sem suporte:** não ativar Discussions por padrão; Issues estruturadas já são o canal de entrada até existir capacidade de moderação.
