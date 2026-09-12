# Pesquisa de mercado — governança de revisão (2026-09-12)

## Método

Foram comparadas fontes primárias dos produtos e plataformas que disputam o mesmo momento de trabalho: agente de código no editor, revisão de pull request, regras de repositório e gate de CI. O objetivo não é copiar interface ou afirmar equivalência de produto; é identificar capacidades que reduzem risco real em times ADVPL/TLPP.

## Achados verificáveis

| Referência | Capacidade observada | Lacuna tratada no PEA |
| --- | --- | --- |
| GitHub Copilot code review | Revisa PRs, lê instruções versionadas e pode ser acionado/reacionado no ciclo do PR | O PEA precisava de uma decisão de gate local, determinística e auditável, independente de modelo/nuvem |
| SonarQube | Trata código novo como baseline e permite classificação humana de issue | O PEA precisava evitar a falsa escolha entre bloquear tudo e ocultar regra inteira |
| Cline e OpenCode | Planos, permissões e execução controlada por host | O PEA mantém a decisão de ambiente no seu policy broker; este gate adiciona decisão de revisão no CI |
| DeepSeek Harness | Componentes configuráveis para modelo, ferramentas, sessões, sandbox e aprovação | O PEA aproveita composição declarativa para uma capacidade pequena; não adota um novo harness geral |
| TOTVS TDS-VSCode / EngPro | Compilação e ergonomia específicas do ecossistema Protheus | O PEA continua complementar: pre-review e evidência, sem duplicar RPO, debug ou AppServer |

## Decisão de produto

Adicionar **Governed Review Gate**: um arquivo opcional `.pea/review-policy.json` declara exceções temporárias por fingerprint. A Action produz três artefatos: `review.json` (evidência crua), `review.sarif` (interoperabilidade) e `review-gate.json` (decisão rastreável). Nenhum desses artefatos prova compilação ou aprova merge automaticamente.

## O que deliberadamente não entra

- “Tudo é plugin” como arquitetura genérica: adicionaria superfície de segurança e manutenção antes de necessidade comprovada.
- Uma base remota de exceções ou um login obrigatório: quebraria offline/local-first e criaria risco de dados.
- Supressão por regra ou sem expiração: não preserva sinal de qualidade.
- Promessa de ganho de produtividade: depende do piloto humano descrito em `docs/effectiveness-methodology.md`.

## Fontes primárias

- GitHub: <https://docs.github.com/en/copilot/concepts/agents/code-review>
- SonarQube: <https://docs.sonarsource.com/sonarqube-server/2025.5/user-guide/about-new-code>
- Cline: <https://docs.cline.bot/core-workflows/checkpoints>
- OpenCode: <https://opencode.ai/docs/agents>
- DeepSeek Harness architecture and safety: <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md> e <https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md>
- TOTVS TDS-VSCode: <https://github.com/totvs/tds-vscode/blob/master/docs/compilation.md>
- TOTVS EngPro: <https://github.com/totvs/engpro-advpl-tlpp-skills/blob/main/instructions/AGENTS.md>

