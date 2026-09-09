# Internal Docker QA evidence — 2026-09-09

**Scope:** maintainer-only validation. Docker is not installed, configured or required by the VSIX, runtime, sample, GitHub Action or normal developer journey.

## Admission decision

The owner-provided community images remain excluded from execution:

- `folegini/Protheus_Docker` and `endersonmaia/totvs-protheus-docker`: rejected as obsolete historical references with no acceptable license detected in the reviewed repositories.
- `juliansantosinfo/*`: quarantined. Its scripts may inform research, but no image containing unverified Protheus artifacts is pulled, executed, shipped or used as release evidence.

The following direct checks used only first-party EngPro images pinned by full digest, project-authored Apache-2.0 fixtures and the database data already distributed by the official image. No customer source, RPO, dictionary, long-lived credential, network, published host port or persistent test container was used.

## Tier 1 — official ADVPL/TLPP analyzer

Image: `totvsengpro/advpl-tlpp-code-analyzer@sha256:de6f533f64f524dc1f9c205f5bfee030237db3672c55c264f15c6ab6717f861b`.

The source is copied into a disposable directory before mounting it at `/tmp`. The container runs with no network, two CPUs, 3 GiB memory, 256 PIDs, all Linux capabilities dropped and `no-new-privileges`.

| Fixture | Exit | Observed contract | Decision |
|---|---:|---|---|
| `sample-review.prw` | 0 | The image emits one all-empty diagnostic object for a clean result. It is a clean sentinel, not a usable finding. | PASS as a documented image-specific normalization rule. |
| `malformed.prw` | 1 | `ERROR`, line `3`, rule `CA0000` and a non-empty precompiler message are present. | PASS as positive failing evidence. |

The earlier malformed result was traced to a read-only mount at `/tmp`: the image's Java process creates temporary files there. A direct workspace mount remains forbidden; only a disposable copy is writable. This is an environment constraint, not a product defect.

**Claim boundary:** the result validates the official analyzer image's clean/failing contract only. It does not create a compiler-equivalence, analyzer-parity, AppServer or production claim. Timeout/cancellation evidence remains planned before any optional adapter is admitted.

## Tier 2 — official Protheus-shaped PostgreSQL

Image: `totvsengpro/postgres-dev@sha256:6c42c5fcb9f08cb1834ab17498693e7f435bb2b6da2841713285d253a8654f95`.

The current direct run passed with no Docker network and no published port. It used user `999:999`, one CPU, 2 GiB memory, 128 PIDs, a read-only root filesystem, capability drop and `no-new-privileges`. Writable `tmpfs` paths were explicitly owned by `999:999`; otherwise the image cannot create its PostgreSQL socket. The image declares no Docker healthcheck, so readiness is proved with `pg_isready` rather than an assumed `healthy` status.

- PostgreSQL `15.2`, database `protheus`, 126 public tables.
- `public.sx2990` and `public.sx3990` were readable through a fresh least-privilege role: 10,814 SX2-shaped rows and 177,368 SX3-shaped rows.
- `UPDATE public.sx2990 ...` failed with `permission denied for table sx2990` under that role.
- Test containers and their anonymous volumes were removed after the run.

**Decision:** PASS for isolated database-fixture/read-denial evidence; PARTIAL for a product database dialect, because no host-supplied PostgreSQL driver is supported or claimed by the VSIX.

## Remaining execution plan without owner input

1. Re-run Tier 1 on each release candidate with the two fixed fixtures, full digests, disposable source copy and captured output/log hashes.
2. Re-run Tier 2 with `pg_isready`, ephemeral role, read-only SX2/SX3 query and write-denial check; record container identity, commit and teardown.
3. Keep Tier 0 deterministic tests as the blocking normal path and prove the installed VSIX on a no-Docker profile.
4. Do not execute Tier Q community images. Their admission remains a legal/provenance/security decision, not a test shortcut.

## Gates that cannot be manufactured

Tier 3 requires legitimate AppServer, RPO, dictionary/includes, License Server/DBAccess and an approved private test environment. Docker does not remove those entitlement requirements. The missing artifacts therefore remain an honest external stable-release gate rather than a reason to use a community image.
