# Qualificação live AppServer v1 — Desenho

## Fronteiras

```text
Fixture CP1252/LF ── TDS VS Code ── AppServer P12/RPO
       │                    │                │
       └── hash local       └── log saneado  └── resultado/rollback

Docker health ── DBAccess ── PostgreSQL Protheus (consultas nomeadas read-only)
```

O TDS permanece dono da conexão, autenticação e compilação. O PEA não simula
o compilador: ele chama a ferramenta pública do TDS, coleta diagnósticos e
falha fechado quando esse contrato não prova sucesso positivo. O TDS direto
produz a evidência independente de compilação e commit no RPO custom.

## Segurança e reversibilidade

- usar somente `localhost:1234`, ambiente `P12` e fixtures `PEA_LAB_*`;
- manter credenciais no prompt nativo do TDS; não ler logs brutos que possam
  conter tokens;
- criar fontes de teste no workspace de laboratório, converter in-place para
  CP1252 e não aplicar patch/RPO delete;
- consultas ao PostgreSQL usam adapter host-neutral, nomes permitidos,
  transação `READ ONLY`, timeout, cancelamento e redação;
- a indisponibilidade do RPO só pode ser injetada no laboratório autorizado,
  com hipótese escrita, hash antes/depois, restauração byte a byte do INI e
  compilação pós-recuperação;
- contenção concorrente de lock permanece `PARTIAL` quando não houver dois
  escritores isolados e um mecanismo determinístico de liberação.

## Evidência

O relatório público retém horário, versão, hash, nome da fixture, resultado e
limites. Logs detalhados ficam locais. Nenhuma evidência deste programa fecha
G6 sem ser vinculada ao commit/VSIX que alega suportar.
