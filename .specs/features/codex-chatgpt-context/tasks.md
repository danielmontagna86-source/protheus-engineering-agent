# Codex/ChatGPT context bridge — Tasks

| ID | Task | Depends on | Done when |
| --- | --- | --- | --- |
| CTX-01 | Define the protocol adapter and fake JSONL App Server tests | — | Tests prove probe/login/turn/error behavior before implementation. |
| CTX-02 | Implement bounded stdio JSON-RPC client and managed-login provider | CTX-01 | No token handling; timeouts/cancellation terminate child safely. |
| CTX-03 | Package adapter and add VS Code connection/status command | CTX-02 | Command uses managed login and localizes unavailable state. |
| CTX-04 | Update Engineering Center, docs and pt-BR/en strings | CTX-03 | **Done:** UI and docs communicate optional, read-only, account-dependent behavior. |
| CTX-05 | Run AI security/eval regression, packaging and Host smoke | CTX-04 | **Done locally:** 322 tests, packaging, publication check and installed-VSIX current/minimum Host smokes pass. TDS coexistence re-run and live managed-login UAT remain separate evidence gates. |
| CTX-06 | Perform user-owned live login/UAT against official CLI | CTX-05 | Pending: evidence records no secrets; failure keeps feature experimental. |

## Test matrix

- protocol initialization and account sanitization;
- executable/protocol rejection;
- managed browser/device login without credential capture;
- structured-output and timeout/cancellation failures;
- indirect-injection context stays data and gateway redaction remains effective;
- extension command/manifest/localization contract;
- installed VSIX smoke with no Codex CLI required.
