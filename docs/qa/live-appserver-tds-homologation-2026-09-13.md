# Homologação live AppServer/TDS — 2026-09-13

**Escopo:** ambiente descartável `Protheus Lab Local`, exclusivo para testes.

**Decisão:** evidência live **PARCIAL**. A matriz provou compilação positiva
identificada com CP1252/LF, include real e caracteres acentuados, além de uma
falha controlada com rollback. A tentativa positiva inicial foi invalidada antes
da promoção porque estava com foco no canal de saída do TDS, não na fixture. O
documento não comprova integração do supervisor de build do PEA e não fecha o
gate Stable/Marketplace.

## Ambiente e controle de escopo

| Item | Valor observado |
| --- | --- |
| VS Code | 1.137.0 |
| TDS VS Code | 2.1.3 |
| AppServer | `Protheus Lab Local` em `localhost:1234` |
| Build detectado | `7.00.240223P`, sem TLS |
| Ambiente Protheus selecionado | `P12` |
| Repositório de objetos | token RPO fornecido pelo TDS; o valor não foi coletado nem registrado |
| Banco/DBAccess do laboratório | PostgreSQL respondeu consulta de catálogo somente leitura; DBAccess teve processo e porta locais ativos, sem adapter PEA |

Nenhuma senha, token, arquivo de conexão ou configuração pessoal é reproduzido
neste documento. A conexão foi autenticada interativamente no prompt nativo do
TDS antes dos casos abaixo.

## Fixtures e integridade prévia

| Fixture | SHA-256 | Finalidade |
| --- | --- | --- |
| `pea_lab_probe.prw` | `f2294d15c58cb0626c7a97ae6f5264e46c3a14bd1f44ef7ce5500f718f0d6940` | Sonda positiva, retorna `PEA_LAB_OK` |
| `pea_lab_invalid.prw` | `d04ba5e934137779cae9f4a6f91399ac416607d571fcc1ba13a0278b6e856594` | Include deliberadamente inexistente para provocar falha |
| `pea_lab_cp1252_20260913.prw` | `675a414b8533ef372e0af7dcf0f0ba9424268730402aa3ab7ec7c00b195f4a83` | Sonda positiva CP1252/LF com `TOTVS.CH` e acentos |

As duas fixtures foram verificadas como round-trip Windows-1252 antes do envio.
Elas usam somente caracteres ASCII; portanto, isto confirma compatibilidade de
codificação da fixture, mas **não** substitui uma prova live com caracteres
acentuados CP1252/LF.

## Casos executados

### APP-TDS-001 — Compilação positiva

- **Data/hora:** 2026-09-13 08:39:29–08:39:37 BRT.
- **Ação:** abrir `pea_lab_probe.prw` como editor ativo e executar
  `Recompile File` (`Ctrl+F9`) no TDS.
- **Ordem de execução observada:** início do build em `P12`, uso do token RPO e
  conclusão com `All files compiled successfully`.
- **Resultado:** **INVALIDADO**. A análise posterior do log mostrou que o TDS
  compilou `extension-output-TOTVS.tds-vscode-#1-TOTVS LS`, isto é, o canal de
  saída estava com foco. O sucesso não é atribuído à sonda e não conta como
  evidência de objeto RPO.

### APP-TDS-002 — Erro de pré-compilação e rollback

- **Data/hora:** 2026-09-13 08:39:55–08:40:07 BRT.
- **Ação:** abrir `pea_lab_invalid.prw` como editor ativo e executar
  `Recompile File` (`Ctrl+F9`).
- **Entrada de falha:** `#include "PEA_LAB_REQUIRED_MISSING_20260912.CH"`.
- **Ordem de execução observada:** início de recompilação em `P12`, compilação
  regular do arquivo, mensagem de pré-compilação com avisos/erros, `Aborting end
  build (rollback changes)` e `Recompile finished`.
- **Resultado:** **PASS**. O erro não foi tratado como sucesso e o TDS informou
  rollback antes do término.

### APP-TDS-003 — Compilação positiva CP1252/LF com include válido

- **Data/hora:** 2026-09-13 08:51:48–08:51:49 BRT.
- **Ação:** compilar no editor ativo `pea_lab_cp1252_20260913.prw` pelo TDS.
- **Entrada:** `#include "TOTVS.CH"`; texto CP1252 `Ação válida: çãé`; finais de
  linha LF. A validação de bytes pré/pós compilação preservou o SHA-256 listado
  acima, confirmou que o arquivo não é UTF-8 válido e que o round-trip CP1252 é
  válido.
- **Ordem de execução observada:** uso dos includes do ambiente, compilação
  regular do caminho exato da fixture, `Source ... compiled successfully`,
  `Committing end build` e `All files compiled successfully`.
- **Resultado:** **PASS**. Esta é a evidência positiva identificada; ela não
  reaproveita o resultado invalidado de APP-TDS-001.

### APP-DB-001 — Saúde de infraestrutura e catálogo somente leitura

- **Data:** 2026-09-13.
- **Ação:** verificar as portas locais do AppServer, DBAccess e PostgreSQL;
  consultar apenas `current_database`, `current_user` e a contagem de tabelas de
  `information_schema` no PostgreSQL do laboratório.
- **Resultado:** **PARTIAL**. As três portas e os processos dos containers
  responderam; PostgreSQL retornou a identidade do banco/sessão e `0` tabelas
  públicas, sem escrita. Não houve consulta através de DBAccess nem adapter do
  produto, portanto não há alegação de compatibilidade de driver/dicionário.

## Limites e próximos casos obrigatórios

Esta evidência é de TDS/AppServer real, porém executada manualmente no TDS. Ela
não permite afirmar que o VSIX do PEA controla ou interpreta a compilação live.
Além disso, o controlador disponível não expôs uma forma verificável de fixar
o editor ativo: quatro tentativas posteriores (atalho, foco de grupo,
`vscode.open` e lista explícita do comando TDS) não produziram requisição de
compilação no log. Antes de promover qualquer release, ainda faltam:

1. Homologar no perfil autenticado a ponte opcional `pea.compileWithTds`, que usa
   a ferramenta pública `tds-lm-tools` do TDS para um alvo explícito. O
   supervisor de build permanece host-neutral e não se conecta sozinho ao
   AppServer/RPO.
2. Executar a mesma matriz através da ponte e guardar artefato de evidência
   saneado, correlacionado ao comando e ao VSIX/commit exatos.
3. Exercitar cancelamento, timeout, RPO bloqueado/exclusivo, dependência
   indisponível e retorno de diagnóstico para Problems. A contribuição instalada
   do TDS 2.1.3 expõe comandos de build/RPO, mas não um comando público de
   cancelamento; não se usou API privada nem operação destrutiva para simular os
   casos.
4. Verificar objeto RPO ou execução segura da sonda, sem consultar ou registrar
   credenciais.
5. Executar consultas de DBAccess/dicionário somente por adapters read-only do
   produto, após fornecer driver e catálogo confiáveis pelo host.

## Impacto no gate G6

O gate G6 avança para **PARTIAL**: há saúde do AppServer/TDS, compilação positiva
identificada CP1252/LF com include real e uma falha controlada com rollback. Ele
continua `NO-GO` para Stable/Marketplace até os casos pendentes acima, sobretudo
a homologação live da ponte pública e a reconciliação com o commit e artefatos
exatos da extensão.
