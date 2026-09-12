# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-07
### Added
- **Production Freeze**: Version 1.0.0 is officially released.
- Complete AI Career Intelligence ecosystem (Roadmaps, Skill Gaps, Job Strategy).
- End-to-end resume parsing, ATS scoring, and profile synchronization.
- Pydantic V2 response validation and prompt injection defenses for the AI Engine.
- Robust refresh token authentication lifecycle (`/auth/refresh` and `/auth/logout`).
- Comprehensive error boundary protection across the React frontend.
- Fully containerized production deployment (Docker, Nginx, FastAPI, Redis, PostgreSQL).

### Changed
- Converted all frontend `window.prompt()` usage to polished inline modals.
- Upgraded backend schemas from Pydantic V1 `@validator` to V2 `@field_validator`.
- Overhauled and cleaned all documentation into the `docs/` folder, removing obsolete Version 2 planning files.

### Fixed
- Fixed critical frontend TypeScript build errors preventing compilation.
- Fixed missing Dockerfile and `docker-compose.yml` deployment configurations.
- Fixed API endpoint test inaccuracies (`test_health`).
