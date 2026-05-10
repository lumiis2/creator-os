"""
Guide to running and understanding the test suite.
"""

# Running Tests

## Install test dependencies:
```bash
cd backend
pip install -r requirements-test.txt
```

## Run all tests:
```bash
pytest -v
```

## Run specific test file:
```bash
pytest tests/test_auth.py -v
```

## Run specific test class or function:
```bash
pytest tests/test_auth.py::TestJWTValidation::test_validate_jwt_with_secret -v
```

## Run with coverage:
```bash
pytest --cov=app tests/
```

## Run only async tests:
```bash
pytest -m asyncio
```


# Test Structure

## conftest.py
Shared fixtures:
- `test_db` — in-memory SQLite AsyncSession for tests
- `test_client` — FastAPI TestClient with dependency overrides
- `valid_jwt_token` — mock JWT token for testing
- `auth_header` — Authorization header with Bearer token
- `test_user_id`, `test_email` — common test data

## test_auth.py
Auth-specific tests:
- `TestJWTValidation` — validates JWT with different modes (secret, public key, JWKS)
- `TestAuthDependencies` — tests FastAPI dependencies (claims extraction, user lookup/creation)
- `TestUserCreation` — tests User + Profile creation and cascade deletes

## test_integration.py
End-to-end tests:
- `TestAuthEndpoints` — tests /auth/health, /auth/me endpoints
- `TestAuthFlows` — tests full signup → login → /auth/me flows

## pytest.ini
pytest configuration (asyncio mode, test paths, markers).


# Key Testing Patterns

## Mock JWT Validation
When you don't want to validate actual JWTs, patch the validator:

```python
with patch("app.auth.dependencies.validate_jwt") as mock:
    mock.return_value = TokenData(user_id=uuid.uuid4(), email="test@example.com")
    # Your test here
```

## In-Memory Database
Tests use SQLite in-memory (not Postgres) for speed. To test with Postgres:

```python
engine = create_async_engine("postgresql+asyncpg://...", echo=False)
```

## Async Tests
Mark tests with `@pytest.mark.asyncio` for async functions:

```python
@pytest.mark.asyncio
async def test_something(test_db):
    result = await get_current_user(...)
```

## Dependency Overrides
Override FastAPI dependencies in fixtures:

```python
app.dependency_overrides[get_db] = override_get_db
```


# Coverage Goals

Aim for:
- JWT validation: 100% (all modes)
- Auth dependencies: 95%+ (all paths, error cases)
- User creation: 100%
- Endpoints: 80%+
- Integration flows: 70%+ (happy path + main error cases)

Run with coverage to see gaps:
```bash
pytest --cov=app --cov-report=html tests/
# Open htmlcov/index.html
```


# Known Limitations

- Tests mock real Supabase (no actual Supabase calls).
- JWKS validation is mocked (doesn't fetch actual keys).
- Database is in-memory (no persistence between tests).
- Email confirmation / OAuth flows are not fully tested (require Supabase SDK).

# Future Improvements

- Add fixtures for pre-seeding test data (users, profiles, social accounts).
- Test social account creation and metrics ingestion.
- Test chat sessions and AI knowledge base.
- Add load/stress tests for concurrent user creation.
- Add contract tests to match Supabase Auth JWT schema.
