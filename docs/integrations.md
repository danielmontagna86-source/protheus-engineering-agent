# Read-only TDN and Dictionary integrations

The runtime can consume locally controlled, versioned JSON snapshots. No credential, remote
request or fallback service is enabled by default. Configure either path only when the file's
provenance is trusted:

```text
PEA_TDN_SNAPSHOT=C:\evidence\tdn-snapshot.json
PEA_DICTIONARY_SNAPSHOT=C:\evidence\dictionary-snapshot.json
```

The same configuration is available to the CLI, MCP server and bundled runtime. `doctor`
reports only whether each adapter is configured. Results contain the source, capture time,
schema version, SHA-256 digest, cache state and load time.

## TDN schema v1

```json
{
  "kind": "pea.tdn.snapshot",
  "schemaVersion": 1,
  "source": "https://tdn.totvs.com/...",
  "capturedAt": "2026-09-07T12:00:00.000Z",
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
The adapter never opens an Oracle connection or reads live SX tables.

## MCP tools

- `pea_tdn_search`
- `pea_dictionary_table`
- `pea_dictionary_field`

Missing configuration returns `INTEGRATION_UNAVAILABLE`; invalid snapshots, unsupported
operations and load timeouts return their own structured error codes. Snapshot data is
untrusted evidence and must not be interpreted as agent instructions.
