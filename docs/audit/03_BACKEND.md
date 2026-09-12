# Backend Audit Report

## Overview
The backend is built with FastAPI and Python 3.10+. It utilizes SQLAlchemy for ORM and Dependency Injection for DB sessions and authentication.

## Findings

### 1. Business Logic Leakage (Medium Risk)
- **Observation**: While the architecture intends to separate Concerns (Router -> Service -> Repo), some routers contain heavy business logic. For example, `app/api/profile.py` contains `get_or_create_profile` and `_build_profile_response`.
- **Impact**: Code reuse is harder, and testing routers requires database mocks instead of just service mocks.
- **Recommendation**: Move data manipulation and business rules entirely into `app/services/`.

### 2. Utility Duplication (Low Risk)
- **Observation**: Functions like `_parse_json_field(val)` are defined directly inside `profile.py`. If other modules need JSON parsing, they likely duplicate this code.
- **Recommendation**: Create `app/core/utils/json_utils.py` for shared helper functions.

### 3. Authentication Dependency (Medium Risk)
- **Observation**: `_require_authenticated(current_user)` is manually called inside endpoints to block `GuestUser`.
- **Recommendation**: Instead of a manual function call, use FastAPI's dependency injection system: `@router.get("", dependencies=[Depends(require_authenticated)])`.

### 4. Error Handling (High Risk)
- **Observation**: Global error handling for Database exceptions (like `IntegrityError`) is lacking in individual endpoints. A `db.commit()` failure will bubble up as a generic 500 Error rather than a semantic 400 Bad Request or 409 Conflict.
- **Recommendation**: Add a global exception handler in `main.py` for SQLAlchemy `IntegrityError` or handle them explicitly in the Service layer.

## CTO Recommendations
- Enforce the Service layer abstraction. Routers should strictly contain `< 20` lines of code mapping request models to service calls.
- Refactor `GuestUser` validation into a Reusable FastAPI Dependency.
