# Read-only TDN and Dictionary integrations

The runtime can inspect, install, update, and consume locally controlled versioned JSON snapshots. No credential, remote request, or fallback service is enabled by default. Engineering Center verifies a regular bounded file, schema, declared license or owner authorization, capture age, and SHA-256 before copying it atomically into `.pea/snapshots/`. Snapshot text is always untrusted data.

```text
PEA_TDN_SNAPSHOT=C:\evidence\tdn-snapshot.json
PEA_DICTIONARY_SNAPSHOT=C:\evidence\dictionary-snapshot.json
```

The same configuration is available to the CLI, MCP server and bundled runtime. `doctor`
reports only whether each adapter is configured. Results contain the source, capture time,
schema version, SHA-256 digest, cache state and load time.

The active `.pea/config.json` profile is authoritative for `tdnSnapshotPath` and `dictionarySnapshotPath`. Profile paths must remain inside the workspace. Environment variables are host-level overrides and must not be committed.

## TDN schema v1

```json
{
  "kind": "pea.tdn.snapshot",
  "schemaVersion": 1,
  "source": "https://tdn.totvs.com/...",
  "capturedAt": "2026-09-07T12:00:00.000Z",
  "license": "owner-authorized-local-snapshot",
  "pages": [
    { "id": "page-id", "title": "Title", "url": "https://...", "body": "Plain text" }
  ]
}
```

Read-only operations are `search` and `get`. Search results are limited to 50 and excerpts
to 500 characters.

## Dictionary schema v1

```json
{
  "kind": "pea.protheus.dictionary",
  "schemaVersion": 1,
  "source": "customer-export:SX2/SX3",
  "capturedAt": "2026-09-07T12:00:00.000Z",
  "license": "owner-authorized-local-snapshot",
  "tables": [
    {
      "name": "SE1",
      "description": "Contas a receber",
      "fields": [
        { "name": "E1_PREFIXO", "type": "C", "length": 3, "decimals": 0, "title": "Prefixo" }
      ]
    }
  ]
}
```

Read-only operations are `table`, `field` and `search`. Names are matched case-insensitively.
The snapshot adapter never opens an Oracle connection or reads live SX tables.

## Generic named-query database port

Oracle and PostgreSQL are unavailable by default; no driver or credential is bundled. A host injects a dialect-specific driver, an exact capability authorizer, and a trusted catalog of named `SELECT` queries. Callers provide only a query name and exact declared scalar binds. Raw SQL, comments, multiple statements, `FOR UPDATE`, DDL, DML, and control blocks are rejected while the catalog loads. Oracle uses named placeholders; PostgreSQL uses contiguous positional placeholders derived from declared bind order.

The generic adapter limits timeout, bind size, rows and fields; declares read-only execution to the driver; redacts configured and conventionally sensitive fields; and returns query name plus SHA-256 identity—not SQL, bind values, connection strings, or credentials. Driver errors are normalized. The host executor must map the supplied `AbortSignal` to real driver/server cancellation and must enforce a read-only transaction; merely returning early while a query continues is not conformant. The legacy Oracle wrapper remains for compatibility while hosts migrate to the generic port.

## MCP tools

- `pea_tdn_search`
- `pea_dictionary_table`
- `pea_dictionary_field`
- `pea_database_query` (provider-neutral; unavailable until a host injects an approved dialect adapter)
- `pea_oracle_query` (legacy-compatible Oracle surface; unavailable until a host injects an approved adapter)

Missing configuration returns `INTEGRATION_UNAVAILABLE`; invalid snapshots, unsupported
operations and load timeouts return their own structured error codes. Snapshot data is
untrusted evidence and must not be interpreted as agent instructions.
