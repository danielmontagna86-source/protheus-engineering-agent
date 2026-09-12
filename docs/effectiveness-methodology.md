# Effectiveness methodology

The project separates deterministic product checks from claims about developer productivity.

## Reproducible technical benchmark

Run `npm run benchmark`. The versioned Apache-2.0 synthetic fixtures exercise known review findings, masked text, symbol discovery and same-file call resolution. The report includes precision, recall, exact first-pass rate, rework items and per-case timing. A passing synthetic benchmark supports only the tested contracts; it does not establish complete ADVPL/TLPP accuracy.

## Human pilot required for productivity claims

Use a paired crossover design with consenting ADVPL/TLPP developers. Each participant completes comparable, legally shareable maintenance tasks once with the extension and once with their normal VS Code/TDS workflow; randomize the order and keep the same compiler, environment and task acceptance tests.

Record only anonymized measures:

- time from task start to accepted result;
- first-pass acceptance against the same compiler/tests;
- review findings introduced, found and resolved;
- number of manual rework cycles;
- task completion and abandonment;
- a short usefulness/trust score.

Publish cohort size, experience bands, task definitions, exclusions, raw anonymized observations, analysis code and confidence intervals. Do not collect source, credentials, personal identifiers, database values or telemetry without separate informed consent. A maintainer must review licensing and company authorization before any real project enters the study.

## Claim gate

`productivityUplift` remains `NOT_PROVEN` until a preregistered pilot has representative participants, accepted tasks in both conditions and a reviewed analysis. `marketLeadership` requires independent market/adoption evidence in addition to product quality; benchmark accuracy alone cannot support it.
