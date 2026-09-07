# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) when applicable.

## [Unreleased]

### Fixed

- Honor the seed directory passed to the v0.4 import helper and remove its
  unused path import so the repository typecheck remains clean.
- Refresh the local shared-UI lock snapshot for its declared graph type
  dependency so isolated typechecks resolve it.
- Route live standard navigation and generated task relations to the canonical
  `beskid-lang.org/docs/standard/` documentation surface.
- Load the normative catalog directly from the root OpenSpec repository and
  remove compatibility calls to the retired Platform Spec APIs.
- Align the tracker Biome CLI with the platform configuration schema.
- Declare the `tsx` runner used by delivery reconciliation scripts.
- Apply the platform Biome preset's safe formatting and import-order fixes.
