# Política de review governada

O GitHub Action do Protheus Engineering Agent continua gerando o review determinístico bruto e o SARIF. Opcionalmente, ele avalia uma política versionada para decidir se findings de `major` ou `critical` bloqueiam o job.

## Uso

```yaml
- uses: danielmontagna86-source/protheus-engineering-agent@<commit-imutavel>
  with:
    scope: auto
    fail-on: major
    policy-path: .pea/review-policy.json
```

Sem o arquivo, a política fica ausente e o comportamento é o mesmo do gate de severidade anterior.

## Política

```json
{
  "schemaVersion": 1,
  "waivers": [
    {
      "fingerprint": "<sha256 presente em review.json>",
      "reason": "False positive confirmado no compilador suportado; ticket PEA-123.",
      "approvedBy": "responsavel-tecnico@example.invalid",
      "expiresAt": "2026-12-31T23:59:59.000Z"
    }
  ]
}
```

Use um fingerprint exportado pelo próprio `review.json`; não invente um valor. A exceção vale apenas até `expiresAt`, exige motivo e aprovador e não pode conter senha, token, dados de cliente ou qualquer segredo. Renove somente após reavaliar o finding.

## Artefatos e decisão

| Artefato | Finalidade |
| --- | --- |
| `review.json` | Findings brutos, estáveis e sem trechos de fonte |
| `review.sarif` | Importação por ferramentas compatíveis |
| `review-gate.json` | Threshold, findings bloqueados, waivers aplicados, vencidos, ambíguos e não utilizados |

Mesmo quando a política admite um finding, o finding continua no JSON e no SARIF. Isso impede que uma exceção silencie a evidência para auditoria ou ferramentas posteriores. Um arquivo inválido, um caminho que escape o workspace ou um link/junction fazem o job falhar fechado.

Se o mesmo fingerprint aparecer em mais de um finding bloqueante, a waiver é marcada como `ambiguousWaivers` e não libera nenhum deles. Corrija ou separe as ocorrências antes de pedir uma nova exceção. Os outputs adicionais da Action são `gate`, `blocked`, `waived`, `expired` e `ambiguous`. A Action não solicita token, não executa upload e não chama rede; o workflow consumidor escolhe se publicará os artefatos.
