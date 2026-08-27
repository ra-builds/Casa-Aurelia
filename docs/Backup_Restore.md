# Backup & Restore — Casa Aurelia

This document defines how to back up and restore the Casa Aurelia application data
safely. It addresses the **B1 (no backups)** finding from Phase 8B.

## What needs backing up

| What | Path (default) | Why |
|------|----------------|-----|
| SQLite database | `backend/casa_aurelia.db` | reservations, menu, users, restaurant |
| Uploaded menu images | `backend/uploads/` | menu item photos (user-generated) |
| Environment/secrets | `backend/.env` | **secrets — store encrypted, off-repo** |
| Schema (for reproducibility) | `backend/alembic/versions/*.py` | tracked in git; enables rebuilds |

## Backup the SQLite database (consistent snapshot)

SQLite is a hot-writable DB. Use the online backup API (`.backup`) rather than a
raw file copy so the snapshot is transactionally consistent even while the app is
running. `sqlite3` ships with most systems / Python distributions.

With the Python stdlib (no `sqlite3` CLI dependency):

```bash
cd backend
venv/Scripts/python.exe -c "
import sqlite3, time
src = sqlite3.connect('casa_aurelia.db')
dst = sqlite3.connect(f'backups/casa_aurelia-{time.strftime(\"%Y%m%d-%H%M%S\")}.db')
src.backup(dst)
dst.close(); src.close()
"
```

Or, with the `sqlite3` CLI:

```bash
sqlite3 "casa_aurelia.db" ".backup 'backups/casa_aurelia-YYYYMMDD-HHMMSS.db'"
```

> Always run the backup from the `backend/` directory (or point to the absolute DB
> path). The database path is derived from `DATABASE_URL`; see `backend/.env`.

## Backup uploads

```bash
cp -R backend/uploads backend/backups/uploads-YYYYMMDD-HHMMSS
```

## Backup the environment file

`backend/.env` contains `SECRET_KEY`, `ADMIN_PASSWORD`, `DATABASE_URL`, etc. Back it
up separately and store it **encrypted** (e.g. password manager / secret manager).
It must never be committed to git.

## Recommended schedule

- **Daily** (or before any admin data change, and always before `alembic upgrade`):
  database + uploads snapshot.
- **Retention**: keep at least the last 7 daily backups plus one weekly and one
  monthly.
- **Verify**: once a week, restore a backup into a scratch copy and confirm it opens
  and passes integrity checks (`PRAGMA integrity_check`).
- Backups should live on a **different volume/region** from the application.

## Restore procedure

1. Stop the backend process (so it is not holding a write connection).
2. Keep a copy of the current live DB as a fallback:
   ```bash
   cp backend/casa_aurelia.db backend/casa_aurelia.db.pre-restore
   ```
3. Copy the chosen backup into place:
   ```bash
   cp backups/casa_aurelia-... .db backend/casa_aurelia.db
   ```
4. Restore `backend/uploads/` likewise if needed.
5. Start the backend and verify:
   - `/api/health` returns `healthy`.
   - Reservation lookup works, and the DB has the expected row counts.
   - `alembic current` matches the schema version the backup was taken at.

## Restore onto a fresh host

The migrations are tracked in git (Alembic). To rebuild a database from scratch on a
new host:

```bash
cd backend
venv/Scripts/python.exe -m alembic upgrade head
```

Then load any prior `.db` backup if you prefer to restore data instead of an empty
schema. Do **not** run `init_db()` (auto `create_all`) in place of `alembic upgrade`
on production — it creates tables but does not apply migrations.

## Restore a crashed/locked database (last resort)

If `casa_aurelia.db` is corrupt, first try:

```bash
PRAGMA integrity_check;
```

If it reports corruption, restore from the most recent known-good backup above.

## Notes / caveats

- WAL mode is enabled (`PRAGMA journal_mode=WAL`). A **consistent backup** requires
  the `.backup` API or `VACUUM INTO`, not a naive `Copy-Item`/`cp` while the app is
  running. The `.backup` API is safe with WAL.
- Do not back up the `-wal` / `-shm` sidecar files as substitutes for a real backup.
