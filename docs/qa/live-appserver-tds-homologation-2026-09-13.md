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

O gate G6 permanece **PARTIAL**: há saúde do AppServer/TDS, compilação positiva
identificada CP1252/LF com include real, uma falha controlada com rollback e as
homologações positiva e negativa observadas pela ponte pública. A subvalidação
funcional PEA → TDS está concluída. O release continua `NO-GO` para
Stable/Marketplace até a reconciliação com o commit e artefatos exatos da
extensão e os demais gates externos de publicação.

## Atualização de execução — 2026-09-14

### Diagnóstico da tentativa `pea.compileWithTds`

O erro `TDS_TOOL_MALFORMED_RESULT` foi localizado no log de uma janela do VS Code
iniciada em 2026-09-12. Essa janela ainda carregava a extensão anterior à correção
da ponte. A instalação global agora contém `Protheus Engineering Agent 0.3.3` e
`TOTVS.tds-vscode 2.1.3`; a ponte instalada envia as opções estruturadas exigidas
pela implementação atual do TDS. A janela antiga precisa ser recarregada antes de
uma nova tentativa, para que a evidência possa ser atribuída à versão 0.3.3.

Não foi registrado conteúdo de credenciais, token RPO, configuração de servidores
ou diagnóstico bruto. O resultado anterior permanece inválido como prova positiva
da ponte e não é reinterpretado como sucesso.

### Verificações repetidas sem mutação

| Caso | Resultado | Limite da evidência |
|---|---|---|
| Bridge TDS: cancelamento, timeout, indisponibilidade, alvo fora do workspace, extensão não suportada e retorno malformado | PASS em testes automatizados | Contrato do PEA; não substitui operação live pelo TDS/AppServer |
| Adapters Dictionary/Oracle/PostgreSQL | PASS em testes automatizados, com allowlist, binds, limite e redaction | Não houve adapter DBAccess live do produto |
| Laboratório local | PASS: AppServer, DBAccess, License Server e PostgreSQL em execução | Porta aberta não prova build nem consulta do produto |
| Banco do laboratório | PASS limitado: PostgreSQL responde a `pg_isready`; sessão de catálogo somente leitura em `WIN1252`; zero tabelas públicas na base `postgres` | Nenhum dicionário Protheus foi inferido e nenhuma DDL/DML/dump foi executado |
| Fixture positiva | PASS: SHA-256 `97C78DA1CF9411C713B6C4F86848C813F77893C508FB2FAAB00E7747EB6B4D98`; round-trip CP1252, sem BOM UTF-8 e somente LF; compilação pela ponte observada em 2026-09-14 | O retorno da ponte não identifica servidor/ambiente |
| Perfil isolado VS Code + TDS | PASS: VS Code 1.137.0, VSIX instalado, TDS 2.1.3 ativado, 24 comandos sem conflito, CP1252/LF e multi-root preservados | Não substitui UAT por teclado/leitor de tela nem build live no AppServer |
| Compatibilidade da entrada estruturada | PASS: o TDS real recebeu uma chamada não mutante com `flags` estruturado e alcançou seu handler público | A chamada propositalmente inválida não compilou fonte nem acessou RPO |

### Próxima ação mínima e segura

Com os cenários positivo e negativo observados pela mesma ponte pública, gerar e
validar um candidato de release a partir do commit exato. Casos de lock, timeout
e cancelamento continuam cobertos no contrato automatizado e só devem virar UAT
live se houver uma janela de laboratório dedicada, sem induzir mutações no RPO.

### Correção de alvo da paleta — 2026-09-14

O erro `an absolute ADVPL/TLPP target is required` não era uma resposta do
AppServer. O log confirmou que ele era lançado pelo PEA antes da chamada ao TDS,
quando a paleta era executada com foco em Saída, Terminal ou outro documento sem
arquivo local. A versão 0.3.5 passa a aceitar o URI explícito, o editor ativo ou,
na falta deles, exatamente uma fonte ADVPL/TLPP local entre os editores visíveis.
Com zero ou mais de uma fonte candidata, a extensão encerra antes de abrir o TDS e
exibe uma orientação clara, sem inventar um alvo.

Os testes de regressão cobrem o fallback com uma única fonte visível e a recusa
de duas fontes visíveis sem invocar a ponte. Esta é evidência do contrato local;
ainda não constitui compilação live pela ponte no AppServer.

### Compatibilidade do contrato de diagnósticos — 2026-09-14

Na tentativa seguinte, o TDS foi chamado mas retornou seu contrato JSON atual:
metadados da chamada na raiz e o resumo `{ errors, warnings, diagnostics }`
dentro de `diagnostics`. O PEA 0.3.4 somente aceitava a forma plana usada pelos
mocks originais e, corretamente, marcou a resposta como não verificada. A versão
0.3.5 reconhece ambas as formas completas, preservando `diagnosticsUpdated` e
`timedOut` como condições obrigatórias. Respostas parciais, não JSON ou sem lista
de entradas continuam `unverified`.

O teste de regressão usa a estrutura concreta do `TOTVS.tds-vscode 2.1.3`.
Ele comprova leitura local do contrato; a execução positiva autenticada está
registrada abaixo.

### Homologação positiva observada da ponte — 2026-09-14

Após a instalação e recarga do `Protheus Engineering Agent 0.3.5`, a execução
informada pelo operador para `pea_lab_cp1252_20260913.prw` retornou:

| Campo | Valor observado |
|---|---|
| Adapter | `tds-language-model-tool` |
| Alvo | caminho absoluto da fixture CP1252/LF no workspace de homologação |
| Diagnósticos | `errors: 0`, `warnings: 0`, `updated: true`, `timedOut: false`, lista vazia |
| Status | `completed` |

Isso prova que o PEA invocou a ponte pública do TDS, recebeu o contrato aninhado
atual e concluiu a compilação sem diagnóstico. O JSON não traz o nome do
AppServer, ambiente ou identificador RPO; portanto esses dados não são inferidos
como prova de proveniência a partir deste recibo isolado.

### Homologação negativa controlada da ponte — 2026-09-14

Na mesma janela já autenticada, a execução informada pelo operador para
`pea_lab_invalid.prw` retornou uma falha verificável da própria ponte, sem editar
configuração de servidor, RPO ou credenciais:

| Campo | Valor observado |
|---|---|
| Adapter | `tds-language-model-tool` |
| Alvo | `pea_lab_invalid.prw` no workspace de homologação |
| Diagnósticos | `errors: 1`, `warnings: 0`, `updated: true`, `timedOut: false` |
| Entrada | `ERROR`, origem `Linter`, linha `2` |
| Erro | `C2090 File not found PEA_LAB_REQUIRED_MISSING_20260912.CH` |
| Status | `failed` |

O resultado fecha o cenário negativo controlado do fluxo público PEA → TDS: o
agente preservou o alvo absoluto e devolveu o diagnóstico estruturado, sem
converter uma falha de compilação em sucesso. Como o recibo não identifica
AppServer, ambiente ou RPO, esses atributos continuam fora desta evidência.
