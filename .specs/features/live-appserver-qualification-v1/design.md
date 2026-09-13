# Qualificação live AppServer v1 — Desenho

## Fronteiras

```text
Fixture CP1252/LF ── TDS VS Code ── AppServer P12/RPO
       │                    │                │
       └── hash local       └── log saneado  └── resultado/rollback

Docker health ── DBAccess ── PostgreSQL (somente metadados)
```

O TDS permanece dono da conexão, autenticação e compilação. O PEA não simula
o compilador: a evidência manual só documenta a fronteira real. Uma futura
integração do supervisor deve produzir seu próprio artefato com identidade,
exit code, correlação e hash.

## Segurança e reversibilidade

- usar somente `localhost:1234`, ambiente `P12` e fixtures `PEA_LAB_*`;
- manter credenciais no prompt nativo do TDS; não ler logs brutos que possam
  conter tokens;
- criar fontes de teste no workspace de laboratório, converter in-place para
  CP1252 e não aplicar patch/RPO delete;
- consultas ao PostgreSQL são `pg_isready` ou catálogos `information_schema`;
- testes de lock/cancelamento só executam se o TDS expuser comando reversível;
  do contrário, são `BLOCKED`, nunca emulados como aprovação.

## Evidência

O relatório público retém horário, versão, hash, nome da fixture, resultado e
limites. Logs detalhados ficam locais. Nenhuma evidência deste programa fecha
G6 sem ser vinculada ao commit/VSIX que alega suportar.
