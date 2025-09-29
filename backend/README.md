## SCI Backend

### Requirements
- Python 3.13+
- UV installed: `pip install uv` or see `https://docs.astral.sh/uv/`

### Setup (with UV)
1. Install dependencies:
   - `uv sync`
2. Activate the environment (optional; `uv` auto-runs inside the venv):
   - `source .venv/bin/activate`

### Migrations
- Run migrations:
  - `uv run alembic upgrade head`
- Create a new migration:
  - `uv run alembic revision --autogenerate -m "Your migration message"`

### Run

#### Development
```bash
uv run python -m app.main
```

#### Production
**Single worker (lightweight):**
```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Multiple workers (high-load):**
```bash
# Install gunicorn first: uv add gunicorn
uv run gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### API Docs
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Project Structure
```
...coming soon
```


### Pre-commit
- Install hooks (from backend dir):
  - `uv run pre-commit install`
- Run on all files:
  - `uv run pre-commit run --all-files`
- Update hook versions:
  - `uv run pre-commit autoupdate`
