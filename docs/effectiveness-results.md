# Effectiveness results — synthetic baseline

Date: 2026-09-07  
Dataset: `pea-synthetic-benchmark-v1`  
License: Apache-2.0 synthetic fixtures

`npm run benchmark` completed five review cases and two CodeGraph cases with the following deterministic baseline:

| Measure | Result |
|---|---:|
| Review true positives | 3 |
| Review false positives | 0 |
| Review false negatives | 0 |
| Review precision / recall | 1.0000 / 1.0000 |
| Exact first-pass case rate | 1.0000 |
| Rework items | 0 |
| CodeGraph symbol recall | 1.0000 |
| CodeGraph call recall | 1.0000 |

Timing is intentionally reported by each live run because it depends on the host. The observed local run completed the seven cases in about 2.3 ms, but this is not a supported performance guarantee.

Decision: deterministic fixture accuracy is supported for this narrow dataset. Productivity uplift and market leadership are not proven. The fixtures are synthetic, omit a live compiler and do not represent the full language or a human developer cohort. Follow [the effectiveness methodology](effectiveness-methodology.md) before publishing any productivity claim.
