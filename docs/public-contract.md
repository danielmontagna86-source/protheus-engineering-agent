# Public contract

## Stable surfaces

- `.pea/config.json`, schema version 1;
- CodeGraph tolerant lexical IR, schema version 2;
- change-review JSON and SARIF 2.1.0 exports;
- documented CLI commands and MCP tool JSON Schemas;
- attributed `memory.jsonl` and `journal.jsonl`, schema version 1;
- snapshot kinds `pea.tdn.snapshot` and `pea.protheus.dictionary`, schema version 1.

Command/configuration inputs and exported review evidence use strict schemas: unknown fields, unsupported versions, ambiguous repositories, unsafe paths, missing grants, malformed provider responses, and unavailable integrations fail closed. Stored JSONL records and imported snapshots may accept additional inert fields for forward compatibility, but the runtime never treats those fields as commands or authority. Documented output fields are additive within a major version unless marked experimental. Removing or changing meaning requires a major version, a migration note, and one supported rollback path.

## Not promised

The parser is not compiler-equivalent. Review does not replace TDS/AppServer compilation, functional tests, security review, or human approval. Hermes, AI providers, Docker, TDN, databases, and AppServer are optional or external boundaries, not installation requirements.

## Experimental surfaces

Hermes ACP compatibility, host-injected AI, subagent transports, and live database/build adapters may change before their own live compatibility gates pass. Their unavailable state is part of the stable fail-closed contract.
