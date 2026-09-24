# Homologação Docker, AppServer e PEA — 2026-09-24

## Decisão

O laboratório comunitário autorizado está **apto para desenvolvimento e para a
matriz local PEA → TDS → AppServer**. O responsável atestou em 2026-09-24 que o
RPO usado no laboratório foi obtido no portal oficial TOTVS. O DBAccess declara
`TOP_NO_LICENSE`; esse estado comercial é registrado, mas não invalida os
resultados funcionais observados. Nenhuma evasão ou licença externa foi aplicada.

Esta execução fecha a pendência técnica do fluxo positivo/negativo no candidato
exato `0.3.9`, melhora a resiliência do laboratório e substitui o antigo erro de
inicialização REST. Ela fecha o caminho funcional positivo/negativo do gate G6,
sem alegar certificação ou suporte oficial TOTVS. Os casos live de timeout,
cancelamento e RPO indisponível, além da repetição no candidato Stable exato,
continuam abertos.

## Autorização e limites

- Responsável pelo laboratório e autorização desta execução:
  `danielmontagna86-source`.
- Escopo autorizado: alterar, recriar, interromper e testar somente o projeto
  Docker local descartável de Protheus usado pelo PEA.
- Fora do escopo: produção, dados reais, credenciais corporativas, bypass de
  licença, publicação no Marketplace e alegação de homologação oficial TOTVS.
- Docker continua sendo infraestrutura privada de QA; não é dependência nem
  componente distribuído pelo produto.

## Candidato e matriz observada

| Item | Evidência |
| --- | --- |
| Commit do candidato | `d033443f1c5dede967fa9c7eac6a904a4f7bc016` |
| PEA | `0.3.9` |
| VSIX SHA-256 | `d61e7b97c458660a9d20d08885477c58ccc55a5d6152b48675e0e0ab272fb776` |
| TDS | `2.1.4` |
| AppServer | `24.3.1.5`, build `7.00.240223P` |
| DBAccess | `24.1.1.1`, modo declarado `TOP_NO_LICENSE` |
| PostgreSQL | `16.13`, encoding/cliente WIN1252 observado pelo DBAccess |
| Imagem AppServer derivada | `sha256:cac10dcba7803b4377f42327c18b3d9ad415da13498b089412ce8653117b6abf` |

As imagens externas de PostgreSQL, License Server e DBAccess permaneceram
fixadas por digest. A imagem AppServer local acrescenta apenas o INI isolado de
laboratório sobre a base comunitária também fixada por digest.

## Correções do laboratório

1. Todos os serviços receberam política de reinício `unless-stopped`.
2. Healthchecks TCP brutos foram substituídos por verificações passivas do
   processo e da porta em escuta. Isso removeu os falsos pacotes inválidos que o
   próprio healthcheck enviava ao License Server.
3. REST foi removido desta instância WebApp/TDS; a configuração anterior fazia
   o WebApp cair numa rota HTTPREST 404.
4. WebMonitor e App Monitor, ativados por padrão nas builds atuais, foram
   desligados explicitamente e suas portas deixaram de ser publicadas.
5. O AppServer foi empacotado numa imagem local mínima porque um novo bind mount
   do Windows ficou preso durante a criação do contêiner.
6. Volumes antigos sem referência foram clonados, comparados por contagem e hash
   agregado e só então removidos dos nomes conflitantes; volumes ativos não
   foram apagados.

## Casos executados

| Caso | Resultado |
| --- | --- |
| Compose válido e quatro serviços saudáveis | PASS |
| WebApp `/webapp/` | PASS, HTTP 200 |
| Seleção real `SIGACFG` / `P12` até a tela de login | PASS, sem automação de credencial |
| Encerramento real de `appsrvlinux` | PASS, reinício automático e WebApp recuperado |
| Encerramento real de `dbaccess64` | PASS, reinício automático e saúde recuperada |
| TDS direto, fixture CP1252/LF válida | PASS, retorno `0` e `SUCCESS` |
| TDS direto, include inexistente | EXPECTED FAIL, retorno `-1` e C2090 |
| Ponte do PEA, fixture válida | PASS, `completed`, 0 erros, diagnóstico atualizado |
| Ponte do PEA, fixture inválida | EXPECTED FAIL, `failed`, 1 erro na linha 2 |
| PostgreSQL em transação somente leitura | PASS, 80 tabelas, 159 MB, 0 índices inválidos |

Recibos saneados mantidos fora da árvore pública:

| Recibo | SHA-256 |
| --- | --- |
| TDS direto (`result.json`) | `024bfaa4a66a4e3d085e0962f36a3a9762b161da5fc1238c74e4d17559c6d88b` |
| PEA → TDS (`pea-bridge-result.json`) | `0cf3383b96635b11730b230f9a0eaf4e1431431776f98a0c8ef121101403abc8` |

Os recibos não contêm senha, token RPO, identidade de usuário ou configuração
de servidor. O hash muda a cada repetição e liga apenas a execução descrita.

## Interpretação do gate G6

O caminho técnico solicitado está comprovado no candidato exato: o PEA chama a
ferramenta pública do TDS, uma fonte válida chega ao AppServer e uma fonte
inválida volta como falha estruturada. Resiliência e exposição local também
foram verificadas.

G6 permanece **PARTIAL** por dois limites materiais:

1. timeout, cancelamento e RPO temporariamente indisponível ainda não foram
   exercitados no caminho live;
2. o artefato avaliado é `0.3.9`, não um futuro candidato Stable único com todos
   os demais gates G0–G13 verdes.

A origem oficial do RPO é uma declaração nominal do responsável e não autoriza
redistribuição. `TOP_NO_LICENSE` não é usado como bloqueio funcional e também
não é convertido em alegação de ambiente comercial licenciado.

## Fontes primárias e upstream

- [TOTVS WebMonitor — ativação padrão e `ENABLE=0`](https://tdn.totvs.com/display/tec/TOTVS%2B%7C%2BWebMonitor)
- [TOTVS: configuração do AppServer](https://tdn.totvs.com/pages/viewpage.action?pageId=6064745)
- [TOTVS Protheus CI Universo](https://github.com/totvs/protheus-ci-universo)
- [Imagem comunitária usada no laboratório](https://hub.docker.com/r/feliperaposo/protheus)
