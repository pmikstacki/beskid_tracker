# Roadmap seed catalog (v0.0–v0.3)

Hand-maintained planning catalog for local development and review. Each delivery version has:

- `version.json` — title, theme, summary, **stage** (`conceptual` | `implementation` | `delivered`), and **cutoff** (date range + end commit SHA + rationale)
- `workstreams/<slug>.json` — grouping metadata for the workstreams dashboard; optional **`deliverableIds`** links a workstream to deliverables
- `tasks/<id>.json` — work items with provenance (`source.repo`, `source.commit`, `source.subject`)
- `deliverables/<id>.json` — optional delivery anchors referenced by tasks

Catalog layout lives under `data/v0.0/`, `data/v0.1/`, `data/v0.2/`, and `data/v0.3/` (one JSON file per entity).

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
| **v0.4+** | Not represented in this seed catalog |
