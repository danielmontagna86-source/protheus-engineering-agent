# Tasks

| Task | Requirement | Status | Evidence |
|---|---|---|---|
| D1 - failing finite-process and lifecycle regressions | EOF-1/2/3 | Complete | RED captured before runtime edits; cancellation-shape and blocked-send regressions reproduced separately |
| D2 - public composed transport and integration | EOF-1/2/3 | Complete | 12 lifecycle tests PASS; 2 real-process cancellation/deadline tests PASS |
| D3 - standard client, finite compatibility and source/bundle smoke | EOF-4 | Complete | standard and finite-input subprocess tests; source/bundle smoke PASS; external reproduction returns all IDs |
| D4 - deterministic clock and expiry boundary | CLOCK-1 | Complete | acceptance before expiry and rejection at expiry PASS using only a child-process Date mock |
| D5 - gates and independent review | All | Complete for local scope | final validate 386/386 PASS; benchmarks PASS; independent functional review without remaining blockers; full audit fails and external matrix remains pending (validation.md) |
