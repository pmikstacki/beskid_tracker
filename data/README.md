# Roadmap seed catalog (v0.0–v0.4)

Hand-maintained planning catalog for local development and review. JSON entities are validated against [JSON Schema](../schemas/seed/index.json) (exported from Zod via `bun run seed:schema:export`).

Each delivery version has:

- `version.json` — title, theme, summary, **status**, and **cutoff** (date range + end commit SHA + rationale)
- `workstreams/<slug>.json` — grouping metadata for the workstreams dashboard
- `tasks/<id>.json` — work items keyed by **slug `id`** (not GitHub issue numbers)
- `deliverables/<id>.json` — delivery anchors referenced by tasks

### Task fields

| Field | Purpose |
|-------|---------|
| `id` | Stable slug; filename must match (`tasks/<id>.json`) |
| `order` | Optional sort key within the version (lower first) |
| `subtasks` | Checklist steps: `{ "text": "…", "done": true \| false }[]` |
| `source` | Git provenance: `repo`, `commit`, `subject`, optional `url` |
| `deliverableId` | Links to `deliverables/<id>.json` |
| `body` | Markdown narrative (Provenance / Catalog scope sections encouraged) |

Legacy **`number`** on tasks or deliverables is removed; run `bun run seed:migrate` once if importing old JSON.

Catalog layout lives under `data/v0.0/` … `data/v0.4/` (one JSON file per entity).

Validate after edits:

```bash
bun run seed:validate
```

Load in the app (read-only; no GitHub issue mutations):

```bash
ROADMAP_USE_SEED=1 bun run dev
```

Production continues to use GitHub Issues as the source of truth unless `ROADMAP_USE_SEED=1` is set explicitly.

## Omitted entity types

| Entity | Reason |
|--------|--------|
| **Public bugs** (`bug` label) | Separate anonymous route; seed is for version-scoped roadmap planning only |
| **v0.5+** | Not represented in this seed catalog |
