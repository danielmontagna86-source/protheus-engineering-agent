# Docker, Marketplace and publication validation

**Date:** 2026-09-10
**Scope:** evidence-led preparation for public distribution; Docker remains maintainer-only QA infrastructure.

## Executed environment checks

Docker Desktop 4.89.0 with Engine 29.7.2 and the `desktop-linux` context was available on this Windows host. The earlier named-pipe initialization error was transient; the engine responded normally to `docker version` and `docker compose version`.

### Official EngPro lane

`totvsengpro/postgres-dev:12.1.2510_bra` was rerun in an isolated, loopback-only container. PostgreSQL reached `pg_isready`; `postgres|postgres` was returned by a read-only query. The image could not start with all Linux capabilities dropped because its entrypoint changes ownership of PostgreSQL paths. A baseline constrained run with `no-new-privileges`, 2 GiB memory, 1.5 CPUs and 256 PIDs passed and was removed with its container.

This is database-fixture evidence only. It does not prove a product database driver, AppServer, RPO, compilation or customer-system compatibility.

### User-authorized community AppServer lane

The release owner explicitly authorized testing the supplied `feliperaposo/protheus` images. The following Docker Hub digests were pulled and used only in a disposable internal network:

- `feliperaposo/protheus:p12.1.2310@sha256:787dedaac3a8d4a8af371136682d3b6ec5e9e995bf871897e0c895d602215c98`
- `feliperaposo/protheus-postgresql:15@sha256:6b7e35a463f7a2ec54e8d170c00c6550a1514d4c00a2e2b683a2a91cdda95330`
- `feliperaposo/protheus-dbaccess:23.1.1.7@sha256:8fcaa2405d88931de6534eaef8be3642079fbe9455ec655c4192c00825f51065`

The exact upstream compose topology was inspected at commit `716bd7919ce33541a40e97eb94042218b4815966`: PostgreSQL, `license-server`, `dbaccess`, then AppServer with `APPSERVER_DATABASE=POSTGRES`. The test waited for PostgreSQL, License Server port 5555 and DBAccess port 7890 before starting the AppServer. PostgreSQL, License Server and DBAccess stayed up. The AppServer then terminated during startup with:

- `FAILURE TO START REST SERVER`
- `Invalid REST Port` (`-107`)

An initial latest-DBAccess run also produced `DBAPI_OUTDATED`, proving that unpinned `latest` is incompatible with the inspected AppServer image. The matched `23.1.1.7` DBAccess tag removed that specific mismatch but did not remove the REST-server failure. Every temporary container, anonymous volume and internal network created for both attempts was removed.

**Decision:** this is a real negative compatibility result. The community stack must not become a product dependency, CI gate, Marketplace prerequisite or evidence of licensed TOTVS homologation. It is retained only as a reproducible maintainer experiment.

## Marketplace and GitHub facts applied

- VS Code publishing requires a Marketplace publisher; its immutable identifier is part of an extension ID. `vsce package` can be run without a publisher credential, while `vsce publish` cannot. [VS Code publishing documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- Microsoft recommends Microsoft Entra workload identity for automated Marketplace publishing and announces retirement of global Azure DevOps PATs on 2026-12-01. The checked-in project therefore has no publishing token or PAT path. [Secure Marketplace publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace)
- GitHub makes Code Security controls broadly available for public repositories; private vulnerability reporting is for public repositories on GitHub.com. Dependabot alerts were enabled through the repository API; the private-reporting endpoint returned `404` while the repository remains private. [GitHub security settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository) and [security advisories](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories)
- Rulesets are available to public repositories on GitHub Free but private-repository rulesets require a paid plan. This is why the required `main` protection must be created and verified immediately after visibility changes. [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

## Publication status

Completed without external identity: repository description/topics, Dependabot alerts, canonical Apache license text, VS Code manifest discovery metadata, versioned launch operation guide and a reviewed 1280 × 640 / 990,721-byte social-preview source asset.

Not automatable: choosing/creating the Microsoft publisher identity, an Entra/Azure workload identity, a public visibility disclosure, a real Marketplace upload, final release tag, and the licensed Protheus/AppServer/RPO evidence. Those operations require separate service identities, legal authority or entitlement and stay fail-closed in the release auditor.
