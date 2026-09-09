# Internal Docker QA evidence — 2026-09-09

**Scope:** maintainer-only validation. Docker is not installed, configured or required by the VSIX, runtime, sample, GitHub Action or user journeys.

## Environment

- Windows x64 host; Docker Desktop 4.89.0; Engine 29.7.2, Linux/amd64.
- No community image was pulled or executed.
- Only project-authored Apache-2.0 sample code and the data already distributed in the official database image were used.

## Tier 1 — official ADVPL/TLPP analyzer

Image: `totvsengpro/advpl-tlpp-code-analyzer@sha256:de6f533f64f524dc1f9c205f5bfee030237db3672c55c264f15c6ab6717f861b`.

The container ran with no network, two CPU maximum, 3 GiB memory, 256 PID maximum, all Linux capabilities dropped and `no-new-privileges`. The source was the packaged `sample-review.prw`; the container was removed after the artifacts were copied.

Observed result:

- container exit `0`, no OOM, analyzer version `2.0.9 Release Abril 2026`;
- ADVPL precompilation reported success;
- `output.json` SHA-256 `43d8059f49d6446c2e0cfee328acabbb02ca2dc078c6131b651e038b19d5e818`;
- `execution.log` SHA-256 `7a7f38934f306645df42b939c3971e547ea9ae8bb618509af516b27fe1b6eb0b`;
- the JSON contained one diagnostic object whose `severity`, `line`, `rule` and `message` were all empty.

Decision: **FAIL / NOT ADMITTED AS RELEASE EVIDENCE.** A successful process exit is insufficient because the result schema is semantically malformed. The official analyzer lane remains open until a pinned image produces meaningful clean/failing JSON, timeout/cancellation evidence and a validated adapter mapping. This result does not block the Docker-free deterministic product, but it blocks any claim of analyzer parity.

Official usage and JSON-output contract: [TOTVS EngPro ADVPL/TLPP Code Analyzer](https://hub.docker.com/r/totvsengpro/advpl-tlpp-code-analyzer).

## Tier 2 — official Protheus-shaped PostgreSQL

Image: `totvsengpro/postgres-dev@sha256:6c42c5fcb9f08cb1834ab17498693e7f435bb2b6da2841713285d253a8654f95`.

The disposable validation container used user `999:999`, no network or host port, one CPU maximum, 2 GiB memory, 128 PID maximum, read-only root filesystem, a bounded socket `tmpfs`, all capabilities dropped and `no-new-privileges`. Health was `healthy`; the container and anonymous data volume were removed after testing.

Observed result:

- PostgreSQL `15.2`; database `protheus`; 126 non-system tables;
- `public.sx2990` and `public.sx3990` were present with expected SX2/SX3-shaped columns;
- bounded SX2 and SX3 reads passed through an ephemeral least-privilege role;
- an `UPDATE` under that role failed with `permission denied for table sx2990`;
- no customer data, external credential, host port or network access was used.

Decision: **PASS for isolated database-environment and read-denial proof; PARTIAL for the product dialect gate.** The generic named-query adapter's allowlist/bind/timeout/redaction behavior passes deterministic tests, while an actual host-supplied PostgreSQL driver has not yet been released and exercised end to end. PostgreSQL therefore remains unavailable by default and outside the stable support claim.

Official development-image scope: [TOTVS EngPro PostgreSQL](https://hub.docker.com/r/totvsengpro/postgres-dev).

## Claim boundary

Neither result is AppServer, RPO, DBAccess, License Server or production homologation evidence. Tier 3 remains external because lawful user-owned artifacts and authorized connectivity are unavailable. These containers are internal QA only and are intentionally absent from product installation and standard CI.
