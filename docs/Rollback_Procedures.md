# Casa Aurelia — Rollback Procedures

Safe rollback strategy for a production deployment. Read together with
`docs/Deployment_Runbook.md`, `docs/Backup_Restore.md` and
`docs/Production_Deployment.md`.

> **IMPORTANT — database migrations are not reversible by reverting code.**
> A schema migration is a forward-only, data-carrying change. Reverting the
> application code does **not** undo a migration. The only supported ways to undo
> a schema change are (a) a forward migration written for that purpose, or
> (b) restoring a pre-migration backup. Always take a fresh backup immediately
> before any `alembic upgrade`.

## When to roll back

Roll back when a deploy is broken: health endpoint 5xx/503, customer pages
erroring, admin inaccessible, reservations failing, uploads failing, or security
headers/HTTPS regressed. Stop the rollout, do not keep piling changes on top of a
known-bad state.

## 1. Application (backend) rollback

1. Identify the previously-known-good release:
   `git log --oneline -10`.
2. Check it out and restart the service:
   ```bash
   cd /opt/casaaurelia
   git checkout <PREVIOUS_KNOWN_GOOD_TAG_OR_COMMIT>   # OPERATOR
   cd /opt/casaaurelia/backend
   ./venv/bin/pip install -r requirements.txt
   systemctl restart casaaurelia-backend
   ```
3. If the previous release required a different set of env variables, restore the
   matching `backend/.env` **from the operator's encrypted backup** (do not delete
   the current `.env` first).

## 2. Frontend rollback

The frontend is static (`frontend/dist`) served by nginx.
1. Check out the previous commit **in the same tree as above** (both backend and
   frontend ship from one commit): the `git checkout` in step 1 reverts both.
2. Rebuild the previous frontend:
   ```bash
   cd /opt/casaaurelia/frontend
   npm ci
   npm run build
   ```
3. Reload nginx (it serves files per request; no daemon restart needed):
   ```bash
   nginx -s reload   # or: systemctl reload nginx
   ```

## 3. Database migration caution

- Never "downgrade" blindly. Alembic `downgrade` steps exist, but they may destroy
  data (column/table removal) and are **not** part of normal operations.
- If the current release migrated the schema and you must go back:
  1. Stop the backend service.
  2. Restore the pre-migration database backup from step 4 (below).
  3. Start the backend with the previous release.
  4. Verify `alembic current` now matches the previous head and the data is intact.
- If only the application broke (no migration ran), do **not** touch the database —
  app rollback alone is sufficient.

## 4. Database backup restoration

1. Stop the service: `systemctl stop casaaurelia-backend`.
2. Keep the current live DB as a fallback: `cp backend/casa_aurelia.db backend/casa_aurelia.db.pre-rollback`.
3. Restore the chosen backup (see `docs/Backup_Restore.md`):
   ```bash
   cp backend/backups/casa_aurelia-<BACKUP>.db backend/casa_aurelia.db   # OPERATOR
   ```
4. Restore `backend/uploads/` from the matching backup if image data was lost.
5. Start the service and verify.

## 5. Configuration rollback

- If `.env` changed and broke startup, restore the previous `.env` from the
  operator's encrypted backups, then `systemctl restart casaaurelia-backend`.
- If nginx config broke: restore your known-good nginx site file
  (`/etc/nginx/sites-available/casaaurelia`), then `nginx -t && systemctl reload nginx`.

## 6. Service restart

After any backend artifact/env change:
```bash
systemctl daemon-reload        # only if the unit file changed
systemctl restart casaaurelia-backend
```

## 7. nginx reload

After any nginx file change:
```bash
nginx -t && systemctl reload nginx
```

## 8. Verification after rollback

- `curl -fsS https://<domain>/api/health` → `"status":"healthy"`.
- `systemctl is-active casaaurelia-backend` → `active`.
- `curl -sI https://<domain>/` shows the security headers (HSTS/CSP).
- `./venv/bin/python -m alembic current` matches the expected head for the release
  you rolled back to.
- Book a reservation end-to-end; check the admin at `/admin`; check one uploaded
  image renders at `https://<domain>/uploads/menu/...`.
- If the rollback was triggered by a migration, confirm row counts / spot-check
  data from the restored backup.
- Record the incident, the triggered revision, and the verification in the
  operator's outage log.

> Keep the failed release's code and backup locally (do not delete) until the
> incident is fully analysed — a rollback is not a diagnosis.