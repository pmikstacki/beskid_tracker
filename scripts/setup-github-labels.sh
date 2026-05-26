#!/usr/bin/env bash
# Create roadmap labels on Cyber-Nomad-Collective/beskid (requires gh CLI and repo write access).
set -euo pipefail

REPO="${GITHUB_REPO:-Cyber-Nomad-Collective/beskid}"

labels=(
  "roadmap/status/backlog|Backlog column|BFD4F2"
  "roadmap/status/in-progress|In progress column|FBCA04"
  "roadmap/status/done|Done column|0E8A16"
  "roadmap/priority/high|High priority|B60205"
  "roadmap/priority/medium|Medium priority|D93F0B"
  "roadmap/priority/low|Low priority|C5DEF5"
  "roadmap/version/v0.1|Delivery band v0.1|006A68"
  "roadmap/version/v0.2|Delivery band v0.2|006A68"
  "roadmap/version/v0.3|Delivery band v0.3|006A68"
  "roadmap/version/v0.4|Delivery band v0.4|006A68"
  "roadmap/spec-approval/pending|Spec linkage awaiting owner approval|E99695"
  "roadmap/spec-approval/approved|Spec linkage approved by repo owner|0E8A16"
  "bug|Public bug tracker (roadmap index)|D73A4A"
)

for entry in "${labels[@]}"; do
  IFS='|' read -r name description color <<< "$entry"
  if gh label list --repo "$REPO" --json name --jq ".[] | select(.name==\"$name\") | .name" | grep -q "$name"; then
    echo "Label exists: $name"
  else
    gh label create "$name" --repo "$REPO" --description "$description" --color "${color#\#}"
    echo "Created: $name"
  fi
done

echo "Done."
echo "Optional scoped labels (created when issues use them):"
echo "  roadmap/workstream/<slug>, roadmap/domain/<slug>, roadmap/area/<slug>, roadmap/feature/<slug>"
