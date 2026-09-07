# Skills and standards providers

The Protheus Engineering Agent treats skills as a governed project resource, not as executable authority.

## Discovery order

For every session snapshot, the runtime reads:

1. `.agents/skills/<name>/SKILL.md`
2. `.github/skills/<name>/SKILL.md`
3. `.pea/skills/<name>/SKILL.md`

Names are deduplicated case-insensitively. The first root wins and reserves the name even when its `SKILL.md` is missing or invalid; the loader will not silently fall back to a lower-priority shadow copy. Every accepted skill includes its repository-relative path, root source, SHA-256 digest, content, and `untrusted-project-data` classification. The loader rejects escaping root links and bounds individual size, total size, and count.

`.pea` is local project state and must not be committed or published. The two tracked `.agents` skills govern development of this product itself:

- `planning-protheus-engineering`: preserves product decisions and creates traceable Specs before implementation.
- `protheus-evidence-review`: distinguishes observed, verified, supported, inferred, and unproven claims during bug, build, release, and product review.

## Official TOTVS EngPro provider

`config/skill-providers.json` records the official [TOTVS EngPro AI Agent Skills](https://github.com/totvs/engpro-advpl-tlpp-skills) repository at an exact reviewed commit. The provider is in `reference` mode:

- the extension does not download or update it automatically;
- the repository does not silently vendor the complete catalog;
- the allow-list identifies the skills relevant to this product's planning, review, compile, dictionary, SQL, documentation, testing, and encoding workflows;
- an update is a reviewed change to the pinned revision and notices;
- if an upstream skill is later imported, its MIT license and source path must remain attributable.

EngPro itself states that skills do not guarantee final code quality and recommends human curation. The product reinforces that boundary with deterministic rules, tests, compiler evidence, and release gates.

## Validated examples and local QA skills

The local validated-example skill is useful for checking whether ADVPL/TLPP framework symbols and parameter order exist in real code. Its source corpus is GPL-3.0 and is not included in this repository or VSIX. It remains an optional developer-side evidence provider.

The installed QA skills inform this repository's test strategy, release-readiness matrix, security review, mutation checks, and code-review workflow. The project captures their relevant outcomes in Specs and automated gates rather than copying a broad unrelated QA catalog into the product.

## Adding or updating a provider

1. Verify the canonical repository and license from the official source.
2. Pin a full 40-character commit SHA; branches and tags are rejected.
3. Add only skills with a concrete product use to `allowedSkills`.
4. Review instructions as untrusted supply-chain content.
5. Update `THIRD_PARTY_NOTICES.md` and relevant tests.
6. Run the full QA and publication gates before merging.

Provider metadata does not grant network, filesystem, build, database, or deployment permission.
