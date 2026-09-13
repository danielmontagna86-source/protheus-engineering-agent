# Especificação — fechamento interno do candidato de release

**Status:** Em execução
**Data:** 2026-09-12
**Escopo:** encerrar pendências que dependem somente do repositório e de suas automações; não publica tag, VSIX ou Marketplace.

## Objetivo

Produzir um candidato reproduzível no commit atual, atualizar os registros que
ainda tratam a revisão jurídica de marca como pendente e separar, por evidência,
o que está concluído internamente dos gates que precisam de publisher, ambiente
licenciado ou participantes humanos.

## Requisitos

### IRC-001 — documentação de governança verdadeira

- Os documentos de handoff e do gate Stable DEVEM reconhecer a aprovação
  jurídica de marca registrada em 2026-09-12.
- Eles DEVEM preservar o disclaimer de projeto independente e exigir nova
  revisão para alteração relevante de nome, território, campanha ou modelo
  comercial.

### IRC-002 — bateria interna reexecutável

- O commit do candidato DEVE passar instalação bloqueada, testes, análise
  estrutural, smoke, benchmark, pacote/verify de release, host VS Code atual e
  mínimo, coexistência TDS, auditoria de dependências e mutação.
- Falhas DEVEM bloquear a promoção; reexecução não pode ser usada para esconder
  instabilidade.

### IRC-003 — gate externo explícito

- O relatório deve distinguir PASS interno de `NO-GO` para Stable/Marketplace.
- Evidência que exige Marketplace, publisher, AppServer/RPO licenciado,
  acessibilidade assistiva ou piloto humano NÃO pode ser simulada ou marcada
  como concluída.

## Não objetivos

- Criar tag ou GitHub Release, publicar no Marketplace ou aceitar termos em
  nome do proprietário.
- Executar AppServer com artefatos não licenciados, usar dados de clientes ou
  inventar UAT/piloto.
- Remover o estado preview ou alegar prontidão Stable.

## Critérios de aceite

1. Os documentos de governança não deixam revisão jurídica de marca como ação
   pendente.
2. A bateria interna completa passa no commit que contém a mudança.
3. O registro de validação preserva os gates externos como `NO-GO` e identifica
   a evidência requerida para cada um.
