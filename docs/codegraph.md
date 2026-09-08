# ADVPL/TLPP CodeGraph

The CodeGraph is a deterministic, offline impact index. It scans supported source files,
decodes UTF-8, UTF-16LE and Windows-1252, records function declarations and calls, and
returns evidence that another tool or reviewer can inspect.

## Evidence contract

`indexWorkspace()` returns the original `nodes` and `edges` plus `analysis`:

- `callers`: resolved call sites for every declared symbol;
- `dependencies`: resolved targets called by every declared symbol;
- `unresolvedTargets`: calls for which the workspace contains no eligible declaration;
- `ambiguousTargets`: calls with every eligible candidate and its file/line;
- `parser` and `limitations`: an explicit statement of what the lexical parser cannot prove.

Symbols use the stable identity `<workspace-relative-file>#<case-insensitive-name>`. Lists are
sorted so equivalent workspace contents produce equivalent evidence. An edge records both
human-readable names and stable source/target IDs.

## Resolution rules

1. A same-file `Static Function` wins and is not visible from another file.
2. A single `User Function` or global `Function` resolves across files.
3. Multiple eligible global declarations are ambiguous, never selected arbitrarily.
4. A missing eligible declaration is unresolved, never presented as a successful link.

## Limits

This is not a complete ADVPL/TLPP parser or compiler. Dynamic calls, macro expansion,
object messages, inheritance, overloads, includes and preprocessor-generated symbols need
semantic or compiler evidence. Consumers must preserve ambiguity and unresolved results;
they must not convert them into guessed dependencies.
