# YAML Frontmatter Schema

`schema.yaml` in this directory is the canonical contract for `docs/solutions/`
frontmatter written by `ce-compound`, retuned for jesusfilm-rag.

Use this file as the quick reference for:
- required fields
- enum values
- validation expectations
- category mapping
- track classification (bug vs knowledge)

## Tracks

The `problem_type` determines which **track** applies. Each track has different required and optional fields.

| Track | problem_types | Description |
|-------|--------------|-------------|
| **Bug** | `build_error`, `test_failure`, `runtime_error`, `performance_issue`, `database_issue`, `security_issue`, `integration_issue`, `logic_error` | Defects and failures that were diagnosed and fixed |
| **Knowledge** | `best_practice`, `documentation_gap`, `workflow_issue`, `developer_experience`, `architecture_pattern`, `design_pattern`, `tooling_decision`, `convention` | Practices, patterns, conventions, decisions, workflow improvements, and documentation. Prefer the narrowest applicable value; `best_practice` is the fallback. |

## Required Fields (both tracks)

- **title**: Human-readable title of the learning (also the doc H1)
- **module**: Module or area affected (free-text, e.g. `retrieval/rank`)
- **date**: ISO date in `YYYY-MM-DD`
- **problem_type**: One of the values listed in the Tracks table above
- **component**: One of `acquisition`, `ingestion`, `retrieval`, `serving`, `contracts`, `registry`, `adapters`, `db-schema`, `eval`, `mcp`, `http-api`, `tooling`, `docs`, `process`
- **severity**: One of `critical`, `high`, `medium`, `low`

> The four anchors `title`, `date`, `problem_type`, `component` are the subset
> re-checked mechanically by `pnpm check:solutions` on every PR.

## Bug Track Fields

Required:
- **symptoms**: YAML array with 1-5 observable symptoms (errors, broken behavior)
- **root_cause**: One of `wrong_api`, `boundary_violation`, `missing_index`, `missing_migration`, `schema_mismatch`, `scope_issue`, `async_timing`, `memory_leak`, `config_error`, `env_misconfig`, `type_error`, `logic_error`, `test_isolation`, `missing_validation`, `missing_workflow_step`, `inadequate_documentation`, `missing_tooling`, `incomplete_setup`
- **resolution_type**: One of `code_fix`, `migration`, `config_change`, `test_fix`, `dependency_update`, `environment_setup`, `workflow_improvement`, `documentation_update`, `tooling_addition`

## Knowledge Track Fields

No additional required fields beyond the shared ones. All fields below are optional:

- **applies_when**: Conditions or situations where this guidance applies
- **symptoms**: Observable gaps or friction that prompted this guidance
- **root_cause**: Underlying cause, if there is a specific one
- **resolution_type**: Type of change, if applicable

## Optional Fields (both tracks)

- **related_components**: Other components involved
- **tags**: Search keywords, lowercase and hyphen-separated

## Backward Compatibility

Docs created before the track system may have `symptoms`/`root_cause`/`resolution_type` on knowledge-type problem_types. These are valid legacy docs:

- Bug-track fields present on a knowledge-track doc are harmless. Do not strip them during refresh unless the doc is being rewritten for other reasons.
- When creating **new** docs, follow the track rules above.

## Category Mapping

- `build_error` -> `docs/solutions/build-errors/`
- `test_failure` -> `docs/solutions/test-failures/`
- `runtime_error` -> `docs/solutions/runtime-errors/`
- `performance_issue` -> `docs/solutions/performance-issues/`
- `database_issue` -> `docs/solutions/database-issues/`
- `security_issue` -> `docs/solutions/security-issues/`
- `integration_issue` -> `docs/solutions/integration-issues/`
- `logic_error` -> `docs/solutions/logic-errors/`
- `developer_experience` -> `docs/solutions/developer-experience/`
- `workflow_issue` -> `docs/solutions/workflow-issues/`
- `best_practice` -> `docs/solutions/best-practices/`
- `documentation_gap` -> `docs/solutions/documentation-gaps/`
- `architecture_pattern` -> `docs/solutions/architecture-patterns/`
- `design_pattern` -> `docs/solutions/design-patterns/`
- `tooling_decision` -> `docs/solutions/tooling-decisions/`
- `convention` -> `docs/solutions/conventions/`

## Validation Rules

1. Determine the track from `problem_type` using the Tracks table.
2. All shared required fields must be present.
3. Bug-track required fields (`symptoms`, `root_cause`, `resolution_type`) must be present on bug-track docs.
4. Knowledge-track docs have no additional required fields beyond the shared ones.
5. Bug-track fields on existing knowledge-track docs are harmless (see Backward Compatibility).
6. Enum fields must match the allowed values exactly.
7. Array fields must respect min/max item counts.
8. `date` must match `YYYY-MM-DD`.
9. After writing the doc, add its row to `docs/solutions/README.md` (the Lessons Index) and run `pnpm check:solutions` — green is a precondition for the PR.

## YAML Safety Rules

Strict YAML 1.2 parsers (`yq`, `js-yaml` strict, PyYAML) reject array items
that start with a reserved indicator character as unquoted scalars. When
writing items for any array-of-strings field (`symptoms`, `applies_when`,
`tags`, `related_components`, or any future array field), wrap the value in
double quotes if it starts with any of:

`` ` ``, `[`, `*`, `&`, `!`, `|`, `>`, `%`, `@`, `?`

Also quote if the value contains the substring `": "` — that punctuation
confuses flow-style parsers. The repo-native `pnpm check:solutions` flags the
two silent-corruption traps (unquoted `` ` #`` and `: `) on every PR.

Example — before (breaks strict YAML):

    symptoms:
      - `pnpm depcruise` does not flag a type-only cross-context import

Example — after (parses cleanly):

    symptoms:
      - "`pnpm depcruise` does not flag a type-only cross-context import"

This rule applies to all array-of-strings frontmatter fields. Scalar string
fields like `title:` and `description:` follow the same quoting rule; see
`schema.yaml` in this directory for the canonical field list.
