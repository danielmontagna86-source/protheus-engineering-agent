# Marca e posicionamento de mercado

**Decisão inicial:** 2026-09-07
**Revisão de descoberta:** 2026-09-12
**Nome público:** Protheus Engineering Agent
**Repositório:** `danielmontagna86-source/protheus-engineering-agent`
**Categoria:** extensão VS Code aberta para engenharia ADVPL/TLPP baseada em evidências

## Decisão de nome

O nome vence por compreensão imediata e intenção de busca: quem desenvolve para
Protheus identifica público, propósito e categoria sem precisar aprender uma
marca inventada. `PEA` pode ser usado apenas como abreviação técnica em
comandos e identificadores; não deve ser a identidade pública isolada.

| Nome | Clareza | Escopo | Diferenciação | Principal risco |
|---|---:|---:|---:|---|
| Protheus Engineering Agent | Alta | Alta | Média | usa marca de terceiro de forma proeminente |
| ADVPL Engineering Agent | Alta | Média | Média | reduz TLPP, runtime e o contexto de engenharia |
| PEA | Baixa | Alta | Baixa | sigla genérica e difícil de descobrir |

O responsável confirmou em 2026-09-12 que a revisão jurídica de marca foi
concluída com aprovação; o registro público de escopo está em
[aprovação jurídica de marca](governance/legal-trademark-clearance-2026-09-12.md).
O projeto não usa a identidade visual da TOTVS e mantém aviso de independência
no README, NOTICE e listing. Mudanças relevantes de nome, território, modelo
comercial ou campanha exigem nova revisão.

## Modelo de posicionamento

**Público:** pessoas desenvolvedoras, consultores, mantenedores e QA que
trabalham com fontes ADVPL/TLPP e customizações Protheus.

**Problema:** contexto de projeto, conhecimento de domínio, revisão e controles
de execução ficam dispersos entre IDE, documentação, scripts e experiência
individual.

**Promessa verificável:** trazer entendimento de código e mudanças ADVPL/TLPP
baseado em evidências para o VS Code que a equipe já utiliza.

**Frase de posicionamento:** o Protheus Engineering Agent é uma extensão VS
Code independente e aberta para equipes ADVPL/TLPP que oferece CodeGraph,
contexto de projeto, revisão determinística e integrações governadas, sustentada
por um runtime reutilizável e compatível com MCP.

**Headline:** Evidências de engenharia para ADVPL/TLPP, dentro do VS Code.

## Pilares de prova

1. Começo por um VSIX: útil sem Hermes, modelo, conta, Python, Docker, Oracle,
   TDN ou AppServer.
2. Evidência antes de automação: achados por arquivo/linha, hashes e gates de
   release explícitos.
3. Contexto específico de Protheus: CodeGraph ADVPL/TLPP, rules, skills e
   portas de integração limitadas.
4. Adoção segura: capacidades externas falham fechadas e permissões são
   delimitadas por ambiente.
5. Coexistência: complementa TDS e hosts de IA escolhidos pelo usuário; não
   recria editor, compilador, debugger, terminal, explorer, Git ou chat.

## Regras de mensagem pública

- Descrever sempre o projeto como independente e comunitário.
- Preferir “para projetos ADVPL/TLPP” e “para equipes que trabalham com
  Protheus” a linguagem de posse ou produto oficial.
- Não alegar endosso, suporte ou filiação da TOTVS, Protheus ou Hermes.
- Indicar adapters, compilação, AppServer, banco, login de provider e resultados
  de produtividade como planejados, limitados ou não verificados quando for o
  caso.
- Tratar findings como assistência de engenharia que exige revisão humana.
- Não disputar o espaço de “agente que faz tudo”; o diferencial público é a
  confiança da mudança Protheus, não a autonomia genérica.

## Chamada inicial

Instale a prévia do GitHub, complete o walkthrough offline de cinco minutos e
valide `diagnóstico → indexação → revisão` em uma amostra legal. Depois, abra
uma issue com reprodução sanitizada ou participe do piloto de fluxos reais.
O Visual Studio Marketplace e uma campanha comercial permanecem posteriores aos
gates publicados de publisher, acessibilidade, evidência de ambiente e revisão
jurídica.
