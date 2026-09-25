# Operational release gates v1 — Tasks

| ID | Task | Status | Validation |
| --- | --- | --- | --- |
| OR-T1 | Record requirements, design and exact validation plan. | Complete | traceability review |
| OR-T2 | Add failing tests for the public-release monitor and workflow contract. | Complete | targeted RED observed |
| OR-T3 | Implement the bounded monitor and scheduled confirmation workflow. | Complete | targeted GREEN + live v0.3.8 probe |
| OR-T4 | Publish the support/monitoring/rollback runbook and strengthen support policy. | Complete | publication contract |
| OR-T5 | Execute two-session RPO contention and mandatory recovery in the private lab. | Complete | sanitized receipt + hashes |
| OR-T6 | Build exact candidate artifacts and execute installed rollback. | Complete | reproducible release verification + installed lifecycle receipt |
| OR-T7 | Run full QA, review, protected PR checks and post-merge checks. | Pending | all technical gates green |
| OR-T8 | Run provenance attestation and scheduled monitor manually on merged `main`. | Pending | public workflow receipts |
| OR-T9 | Reconcile the Stable ledger and issue #22 without closing external gates. | Pending | release check remains fail-closed |
