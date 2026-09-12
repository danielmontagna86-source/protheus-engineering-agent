# Benchmark de descoberta no GitHub e marca do produto

**Data da pesquisa:** 2026-09-12
**Método:** inspeção do repositório atual e GitHub API; documentação oficial do VS Code/GitHub; comparação de superfícies públicas de projetos abertos. Contagens são retratos no momento da consulta, não medida de qualidade, eficácia ou mercado endereçável.

## Diagnóstico executivo

O repositório já tem uma base de confiança incomum para um projeto jovem: licença Apache-2.0, Community Profile 100%, templates de issue/PR, segurança, dependências e workflows fixados, proteção de `main`, varredura de segredos, CodeQL, release preview com hashes e documentação bilingue. O problema principal é de consistência e descoberta, não de falta de controles: o guia operacional ainda descrevia o repositório como privado embora o estado vivo seja público.

O posicionamento recomendável é **camada de evidências de engenharia para ADVPL/TLPP no VS Code**. TDS continua sendo o editor/compilador/debugger; Cline, Continue, Roo Code e OpenCode continuam sendo hosts horizontais de IA. O PEA deve oferecer o que nenhum deles conhece nativamente: contexto e regras de projeto Protheus, revisão determinística com evidência, política por ambiente e integrações governadas.

## Evidência do repositório PEA

| Sinal observado em 2026-09-12 | Resultado | Leitura correta |
| --- | --- | --- |
| Visibilidade / licença | público / Apache-2.0 | pronto para descoberta de código, não para chamar de estável |
| Community Profile | 100% | contratos comunitários básicos presentes |
| Segurança | CodeQL, secret scanning, Dependabot e private vulnerability reporting ativos | boa fundação de confiança; cada candidato ainda exige sua evidência exata |
| Proteção `main` | PR, conversas resolvidas, admin enforcement e 9 checks obrigatórios; zero aprovações por exceção de mantenedor único | reduz regressões, não equivale a revisão independente |
| Release | `v0.3.0` é GitHub pre-release com VSIX, SBOM, manifesto e SHA-256 | canal de prévia real; Marketplace e Stable seguem `NO-GO` |
| Comunicação | 15 tópicos específicos, README pt-BR/en, ícone 128px e preview social 1280×640 | boa base; falta confirmar o upload do social preview e adicionar capturas reais acessíveis |

## Comparação de referências abertas

| Projeto | Sinal de adoção consultado | O que é repetível | O que não deve ser copiado pelo PEA |
| --- | ---: | --- | --- |
| [OpenCode](https://github.com/anomalyco/opencode) | 206.950 estrelas, 27.100 forks | mensagem curta, release frequente, produto identificável | prometer autonomia genérica, shell e permissões amplas |
| [Cline](https://github.com/cline/cline) | 67.893 estrelas, 7.336 forks, Discussions ativo | documentação pública, comunidade e escolhas de provider visíveis | transformar o PEA em executor autônomo de arquivos/terminal |
| [Aider](https://github.com/Aider-AI/aider) | 48.919 estrelas, 4.942 forks | proposta simples, install path e escopo claro | trocar a superfície VS Code/TDS por terminal próprio |
| [Continue](https://github.com/continuedev/continue) | 35.883 estrelas, 5.370 forks | extensão, runtime aberto e modelos/ferramentas configuráveis | abandonar os controles de rota, evidência e contexto do PEA |
| [Roo Code](https://github.com/RooCodeInc/Roo-Code) | 24.303 estrelas, 3.418 forks | documentação de modos e distribuição em canais de extensão | assumir que chat e edição autônoma são diferenciais Protheus |
| [TDS-VSCode](https://github.com/totvs/tds-vscode) | 208 estrelas, 120 forks | referência oficial do fluxo editor/compile/debug Protheus | duplicar compilador, RPO, debug, terminal, explorer ou Git |
| [TOTVS EngPro Skills](https://github.com/totvs/engpro-advpl-tlpp-skills) | 131 estrelas, 64 forks | padrões de domínio e contribuição aberta | declarar skill como prova de compilação ou conformidade universal |

As contagens são oferecidas apenas como escala de descoberta na API pública em 2026-09-12. A maturidade de um produto depende também de manutenção, suporte, segurança, compatibilidade e evidência de uso; não há inferência causal entre estrelas e qualidade.

## Ajustes aplicados nesta entrega

1. Atualizar a descrição pública para português, objetiva e independente.
2. Corrigir a documentação de operações para o estado público real, sem fechar gates de Marketplace/Stable.
3. Acrescentar a categoria `Programming Languages` ao manifesto; `Linters` e `Testing` continuam refletindo capacidades entregues.
4. Tornar a instalação pelo GitHub preview e o primeiro valor offline mais claros no README.
5. Proteger a consistência editorial com regressões de publicação.

## Lacunas que não devem ser escondidas

- O repositório não tem website ou domínio próprios; manter `homepage` vazia no GitHub é mais honesto que apontar a uma página fictícia. Um site só deve ser publicado com política de privacidade, suporte, acessibilidade e demonstrações reais.
- O preview social foi revisado no repositório, mas deve ser atribuído na configuração do GitHub e conferido em um card público.
- Não há capturas reais, sanitizadas e acessíveis do VSIX instalado. Elas são necessárias antes de uma listing no Marketplace, mas uma imagem sintética não deve substituí-las.
- Discussions é uma escolha de operação, não um selo de qualidade. O canal deve ser habilitado apenas quando houver rotina de moderação e encaminhamento definida no `SUPPORT.md`.
- Marketplace exige publisher, termos e artefato exato. O [guia oficial de publicação](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) informa que publisher verificado requer extensão e domínio elegíveis por pelo menos seis meses; esse selo é meta posterior, não pré-requisito para a primeira prévia.
- O uso proeminente de `Protheus` exige revisão jurídica antes de promoção comercial relevante. Este documento não é parecer jurídico.

## Estratégia de adoção recomendada

1. **Primeiro valor verificável:** video curto e reproduzível do VSIX instalado: abrir o exemplo legal, indexar, revisar mudança e navegar em Problems. Incluir versão, hash, limitações e roteiro.
2. **Distribuição de nicho:** publicar em português e inglês para comunidades ADVPL/TLPP/TDS com uma jornada por material, sem prometer “agente que faz tudo”.
3. **Confiança contínua:** notas de versão, issues com reprodução, resposta dentro da capacidade declarada e changelog honesto de limitações/falhas corrigidas.
4. **Aprendizado real:** convidar participantes para o piloto pré-registrado; medir conclusão da primeira jornada, falsos positivos e tempo até mudança verificada. Instalações e estrelas entram somente como métricas de descoberta datadas.

## Fontes

- [VS Code — publicação de extensões](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code — manifesto da extensão](https://code.visualstudio.com/api/references/extension-manifest)
- [VS Code — Marketplace](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)
- [GitHub — README de repositório](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- Repositórios citados na tabela, consultados diretamente pela GitHub API em 2026-09-12.
