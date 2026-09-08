# Supervised build contract

The build supervisor is a host-neutral boundary around a compiler runner. It does not discover
or connect to AppServer/RPO by itself, and the default runtime does not expose arbitrary process
execution through MCP.

Every run records a version, request ID, mode, environment, named approval evidence, policy
decision, command identity, per-step timeout, bounded stdout/stderr, duration, compiler result
and checksummed artifacts. The first blocked, failed, timed-out, cancelled or unverified step
stops the plan.

## Evidence levels

- `simulation`: an injected synthetic runner completed; this is never compiler proof.
- `compiler-verified`: every compiler step returned exit code zero, a non-empty compiler
  identity and at least one workspace-contained SHA-256 artifact.
- `none`: the run is blocked, failed, timed out, cancelled or unverified.

A compiler-mode exit code zero without compiler and artifact evidence becomes `unverified`,
not `completed`.

## Host integration

`createProcessBuildRunner()` executes an explicit executable and argument array with
`shell: false`, an isolated working directory and cancellation signal. Artifact paths must be
relative to the declared workspace and are hashed after a successful process exit. Hosts must:

1. select the executable and immutable command plan from trusted configuration;
2. obtain a capability grant and named approval outside untrusted project content;
3. use a homologation AppServer/RPO for the first real validation;
4. redact credentials before command construction and never include secrets in arguments;
5. retain the returned evidence with the bug/release record.

The product deliberately has no default deploy step. A live Protheus compiler/AppServer test is
an environment acceptance gate and cannot be replaced by the simulation suite.
