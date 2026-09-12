# API Audit Report

## Overview
FastAPI auto-generates Swagger/OpenAPI documentation. The API uses Pydantic schemas for request validation and response serialization.

## Findings

### 1. HTTP Status Codes (Low Risk)
- **Observation**: Most endpoints rely on FastAPI's default `200 OK` status code. 
- **Recommendation**: Explicitly define status codes in the decorator (e.g., `status_code=status.HTTP_200_OK`, `status_code=status.HTTP_201_CREATED`) for clarity.

### 2. Swagger Documentation (Low Risk)
- **Observation**: Endpoints lack detailed `summary`, `description`, and `responses` definitions in the decorators.
- **Recommendation**: Enhance decorators to generate richer OpenAPI documentation for frontend consumers.

### 3. Missing Rate Limiting (High Risk)
- **Observation**: AI-heavy endpoints (e.g., `career_copilot.py`) do not appear to have route-level rate limiting.
- **Impact**: Vulnerable to abuse, leading to massive OpenAI/LLM API costs.
- **Recommendation**: Implement `slowapi` or custom Redis rate limiting on all `/ai/` and `/copilot/` routes.

### 4. Patch vs Put Semantics
- **Observation**: `profile.py` correctly differentiates `PATCH` (partial update) and `PUT` (replace). However, both map to the same internal function `update_profile` which uses `exclude_unset=True`. 
- **Impact**: `PUT` acts identically to `PATCH`. A true `PUT` should replace the entire object and set missing fields to `None`.
- **Recommendation**: Adjust the `PUT` implementation to enforce full replacement.

## CTO Recommendations
- **IMMEDIATE**: Add Rate Limiting to all routes invoking the `AIGateway`.
- Standardize OpenAPI responses and explicit status codes.
