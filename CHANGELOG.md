# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-03-30

### Added

- Initial release of ghost-gl-core
- RBush-based spatial indexing for O(log n) viewport queries
- Three-state materialization model (ghost/shell/live) with budget-driven scheduling
- Collision resolution in vertical, horizontal, and both directions
- Auto-compact layout algorithm
- Transaction system with undo/redo support
- Interaction management for drag/resize operations
- Constraint validation and boundary enforcement
- Comprehensive test suite (90+ tests)
- Benchmark suite demonstrating 100x speedup over O(n) baseline

## Package Versions

- `ghost-gl-core`: 0.1.0
- `ghost-gl-react`: 0.0.0 (unreleased)

---

*This changelog is automatically generated via [Changesets](https://github.com/changesets/changesets).*
