# Environment permissions

Every operation starts with a named environment and exact capability. Undeclared capabilities are denied even if an unrelated grant is present.

- `local` and `development` support the offline workflow; writes, builds and AI-provider calls require an explicit grant.
- `test` is deterministic and cannot build, call Oracle or invoke an AI provider.
- `homologation` and `production` require explicit grants for context/workspace writes, build execution, Oracle reads and AI-provider calls.

Hosts that support interactive approval use `createPermissionBroker`. A successful approval contains a correlated request ID, approver identity and timestamp. Missing handlers, denial, exceptions, invalid responses, timeout and cancellation all return a denial. The core does not persist or silently reuse an approval; the host decides grant lifetime.
