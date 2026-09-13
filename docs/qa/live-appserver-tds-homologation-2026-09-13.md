# Homologação live AppServer/TDS — 2026-09-13

**Escopo:** ambiente descartável `Protheus Lab Local`, exclusivo para testes.

**Decisão:** evidência live **PARCIAL**. A matriz provou compilação bem-sucedida e
falha controlada no AppServer através do TDS. Ela não comprova a integração do
supervisor de build do PEA nem fecha o gate Stable/Marketplace.

## Ambiente e controle de escopo

| Item | Valor observado |
| --- | --- |
| VS Code | 1.137.0 |
| TDS VS Code | 2.1.3 |
| AppServer | `Protheus Lab Local` em `localhost:1234` |
| Build detectado | `7.00.240223P`, sem TLS |
| Ambiente Protheus selecionado | `P12` |
| Repositório de objetos | token RPO fornecido pelo TDS; o valor não foi coletado nem registrado |
| Banco/DBAccess do laboratório | serviços ativos no compose de teste; não exercitados nesta matriz |

Nenhuma senha, token, arquivo de conexão ou configuração pessoal é reproduzido
neste documento. A conexão foi autenticada interativamente no prompt nativo do
TDS antes dos casos abaixo.

## Fixtures e integridade prévia

| Fixture | SHA-256 | Finalidade |
| --- | --- | --- |
| `pea_lab_probe.prw` | `f2294d15c58cb0626c7a97ae6f5264e46c3a14bd1f44ef7ce5500f718f0d6940` | Sonda positiva, retorna `PEA_LAB_OK` |
| `pea_lab_invalid.prw` | `d04ba5e934137779cae9f4a6f91399ac416607d571fcc1ba13a0278b6e856594` | Include deliberadamente inexistente para provocar falha |

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
- **Resultado:** **PASS**. A janela ativa do VS Code era
  `pea_lab_probe.prw - workspace`; o TDS retornou sucesso para o build da
  sonda no ambiente conectado.

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

## Limites e próximos casos obrigatórios

Esta evidência é de TDS/AppServer real, porém executada manualmente no TDS. Ela
não permite afirmar que o VSIX do PEA controla ou interpreta a compilação live.
Antes de promover qualquer release, ainda faltam:

1. Executar APP-TDS-001/002 através do adaptador/supervisor de build do PEA e
   guardar artefato de evidência saneado e correlacionado ao comando.
2. Exercitar cancelamento, timeout, RPO bloqueado/exclusivo, include válido,
   dependência indisponível e retorno de diagnóstico para Problems.
3. Verificar objeto RPO ou execução segura da sonda, sem consultar ou registrar
   credenciais.
4. Repetir uma fixture com caracteres CP1252 e finais de linha LF, preservando
   o hash antes/depois.
5. Executar os testes live de DBAccess/dicionário somente através dos adapters
   read-only aprovados do produto.

## Impacto no gate G6

O gate G6 passa de **BLOCKED sem runtime live** para **PARTIAL**: há evidência
de compilação positiva, erro controlado, RPO token e rollback em AppServer/TDS
de laboratório. O gate continua `NO-GO` para Stable/Marketplace até os casos
pendentes acima e a reconciliação com o commit e artefatos exatos da extensão.
