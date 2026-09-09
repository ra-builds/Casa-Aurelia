# Casa Aurelia — VPS Infrastructure Plan (P2-0C)

Infrastructure blueprint for a secure, always-on production host for the Casa
Aurelia application. This document is **planning/provisioning-ready**: as of
P2-0C no VPS has been purchased or provisioned and no provider account exists.
It defines the target architecture, the recommended provider class, the exact
server specification, the security baseline and the operational checklist that
P2-0D (application deployment) and P2-0F (domain + HTTPS) will build on.

References: `docs/Production_Deployment.md` (application architecture and
reverse-proxy responsibilities), `docs/Deployment_Runbook.md` (step-by-step
deploy), `docs/Backup_Restore.md` (SQLite + uploads backup procedure),
`docs/Security_Headers_CSP_HSTS.md` (headers), `deploy/*.example` (templates).

---

## 1. Target architecture

```text
Internet
   |
HTTPS (TLS terminated at nginx)
   v
nginx (Ubuntu LTS, one always-on VPS)
   +-- /            -> frontend/dist      (React static build, SPA fallback)
   +-- /assets/*    -> frontend/dist      (immutable hashed assets, long cache)
   +-- /api/*       -> 127.0.0.1:8000     (FastAPI / Uvicorn)
   +-- /uploads/*   -> 127.0.0.1:8000     (persistent upload dir via backend)
                                  |
                                  v
                         Uvicorn (systemd, non-root)
                                  |
                                  v
                         SQLite (persistent disk, WAL) + uploads (persistent disk)
```

Single always-on VPS + nginx + systemd + SQLite + persistent disk. No
PostgreSQL, no Docker/Kubernetes, no object storage, no cross-origin split.
Uvicorn binds to `127.0.0.1:8000` only; nginx is the only public entry point.

---

## 2. Provider research summary (current as of 2026‑09‑09)

Prices are indicative, exclude VAT where noted, and change frequently (Hetzner
adjusted Cloud prices in June 2026; OVHcloud announced 2026 VPS range/price
changes). **Verify the current quote at purchase time.**

| Provider | Fits the target | Representative plan | Notes |
|---|---|---|---|
| **Hetzner Cloud** (DE) | Yes | CX23: 2 vCPU / 4 GB RAM / 40 GB NVMe, 20 TB traffic, ~€5.49/mo + ~€0.50 IPv4 (~€5.99/mo); EU regions Falkenstein / Nuremberg / Helsinki | Best price/performance for this class; predictable billing with monthly cap; Europe/GDPR-friendly; 20 TB/month included; IPv6 always included. Backups/snapshots optional (add-on). Strong tooling (CLI/Terraform). |
| **DigitalOcean** (US) | Yes | Basic 1 GB / 25 GB / 1 TiB transfer: $6/mo (1 shared vCPU); Basic 2 vCPU / 4 GB / 80 GB / 4 TiB: $24/mo | Great docs/UI, 99.99% SLA, free firewall + monitoring, 500 GiB– TiB transfer included. More expensive per GB of RAM than Hetzner. Backups weekly +20% of Droplet cost; snapshots on demand. Regions include Amsterdam/Frankfurt/London. |
| **OVHcloud** (FR) | Yes (budget pick) | New VPS lineup, e.g. VPS‑1 from ~$4.20/mo: 4 vCores / 8 GB / 75 GB NVMe, unlimited traffic (rate-limited ~400 Mbps), **free daily backup of the previous 24 h**; VPS‑2 ~$6.75/mo: 6 vCores / 12 GB / 100 GB NVMe | Raw value is excellent and daily backups are included free; EU/GDPR-friendly; anti-DDoS included. Trade-offs: bandwidth is capped rather than quota-based, VPS pricing/plans were changing through 2026 (verify the exact current spec/promo), and the ecosystem is less uniformly polished than Hetzner/DO. |

All three provide Ubuntu LTS images and meet reliability, IPv4, region and
nginx/systemd requirements for a small portfolio/demo restaurant site.

### Recommendation

**Primary recommendation — Hetzner Cloud CX23** (`2 shared vCPU / 4 GB RAM /
40 GB NVMe`, Ubuntu 24.04 LTS, EU region such as `fsn1`/`nbg1`/`hel1`):
best balance of reliability, predictability, European operation and low
monthly cost for this workload. Enable the optional Hetzner **backups** add‑on
if the operator wants a provider-level safety net in addition to the
application-level backup plan (§9).

**Budget/value alternative — OVHcloud new VPS‑1** if included free daily
backups and the larger 8 GB RAM matter more than raw bandwidth determinism;
**DigitalOcean** remains the most turnkey option if the operator prefers its
console over raw price/performance.

No provider is selected until the operator performs the final price/spec
comparison at purchase. Nothing has been purchased or configured.

---

## 3. Server specification

| Parameter | Minimum acceptable | Recommended |
|---|---|---|
| CPU | 2 shared vCPU | 2 shared vCPU (AMD/Intel, x86_64) |
| RAM | 2 GB | 4 GB |
| Storage | 40 GB SSD (NVMe preferred) | 40–80 GB NVMe SSD |
| OS | Ubuntu 24.04 LTS (x86_64) | Ubuntu 24.04 LTS (x86_64) |
| Region | — | European (DE/FR/FI/NE); Frankfurt/Falkenstein/Nuremberg/Helsinki |
| IPv4 | required (primary) | required |
| IPv6 | optional | optional (enable when offered; not required) |
| Bandwidth | ≥ 500 GB/month outbound | any (expected usage: well under 20 GB/month) |
| Backups | provider snapshot able | provider snapshot or backups add-on enabled |
| Estimated monthly cost | ~€5–7 ($6–8) | ~€5–7 ($6–8) + optional backups add-on |

Resource rationale: FastAPI + Uvicorn + nginx + SQLite fit comfortably in 4 GB
RAM with headroom for Alembic/seed runs and OS caching. The frontend build runs
**locally/CI**, not on the server, so no heavy build resources are needed. Do
not oversize further for the initial portfolio/demo deployment.

---

## 4. OS / server layout

Ubuntu LTS (24.04). Canonical application root is `/opt/casaaurelia/` (the
path already assumed by `deploy/*.example` and `.env.production.example`), so
P2‑0D works with zero template drift.

```text
/opt/casaaurelia/
├── backend/
│   ├── .env                   # production secrets (0600, owned casaaurelia)
│   ├── casa_aurelia.db        # SQLite database (plus -wal / -shm)
│   ├── backups/               # staging area for local backups (0600)
│   ├── uploads/               # UPLOAD_DIR (menu images; uploads/menu/)
│   └── venv/                  # Python virtual environment
├── frontend/
│   └── dist/                  # production build output (nginx `root`)
└── logs/                      # optional app-side logs (nginx uses /var/log/nginx)
```

Both the SQLite database (with its `-wal`/`-shm` files) and `uploads/` live on
the **persistent boot volume** and survive restart, reboot, redeploy and
update. This layout is not created remotely yet — it is applied during P2‑0D.

---

## 5. Security baseline checklist (applied during provisioning)

- Create a non-root deployment/service user, e.g. `casaaurelia`.
- SSH key authentication only; generate an ed25519 key locally, install the
  public key, and **keep the current SSH session open while validating a second
  session** before disabling anything.
- Disable password SSH authentication (`PasswordAuthentication no`).
- Disable root SSH login (`PermitRootLogin prohibit-password` → `no`) and root
  password auth.
- UFW firewall: default-deny incoming, allow only SSH (22), HTTP (80), HTTPS
  (443); outbound allowed.
- Port 8000 stays private: Uvicorn binds `127.0.0.1:8000`; nothing forwards
  public traffic directly to it.
- nginx is the only public listener; everything else is loopback-local.
- Automatic security updates enabled (`unattended-upgrades`).
- Correct file ownership: application files owned by `casaaurelia`; nginx only
  reads `frontend/dist` (world-readable 755/644).
- Least privilege: service user has no sudo beyond initial admin tasks (a
  separate admin user or `casaaurelia` in a limited sudo group at the
  operator's discretion); SQLite/upload dirs writable only by `casaaurelia`.
- systemd unit runs as `casaaurelia` (see `deploy/casaaurelia-backend.service.example`).
- The SQLite database is never exposed over the network (no file server, no
  share); it is reachable only through the application on loopback.
- Fail2ban is optional, not required for the initial deployment (SSH is
  key-only + firewall-restricted).

---

## 6. SSH plan

Post-provisioning (operator-owned, run on the host):

```bash
# Generate a key locally (NOT on the server):
ssh-keygen -t ed25519 -C "casa-aurelia-admin" -f ~/.ssh/id_casaaurelia
# Copy the public key to the server, then test a NEW session with it:
ssh-copy-id -i ~/.ssh/id_casaaurelia.pub casaaurelia@<VPS-IP>
ssh -i ~/.ssh/id_casaaurelia casaaurelia@<VPS-IP>   # <-- verify BEFORE locking down
```

Then, only after the new key session works and a second validated session is
kept open, harden `sshd_config`:

```text
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
AllowUsers casaaurelia
```

`sudo systemctl reload ssh` (reload first, not restart) — and **never close
the existing session until the new key session reconnects successfully after the
reload**. Keeping the current session open is required before disabling
password/root access; if lock-out is ever suspected, recover via the provider
console (VNC/vendor reset).

---

## 7. Firewall (UFW) plan

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH (or a chosen high port, then also update sshd)
sudo ufw allow 80/tcp      # HTTP -> redirect to HTTPS
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status verbose    # verify
```

- Never open `8000` (Uvicorn must not be reachable from the Internet).
- The SQLite DB, `uploads/`, `.env` and internal app directories are filesystem
  data, not network services: they are protected by ownership/permissions and
  by not running any file server for them; nothing forwards public traffic to
  them. UFW does not need explicit rules for paths — only the service ports are
  allowed (22/80/443).
- No broad/unnecessary port exposure.

Firewall rules are NOT applied now — no server exists; this is the checklist
for provisioning.

---

## 8. Timezone

Production server timezone **must** be `Europe/Rome` (reservation "today" and
closed-day logic use server-local dates).

```bash
sudo timedatectl set-timezone Europe/Rome
timedatectl          # verify: "Time zone: Europe/Rome"
```

Application reservation/date logic is unchanged (not part of this phase).

---

## 9. Storage plan (SQLite + uploads)

Persistent locations (all on the boot volume, owned `casaaurelia:casaaurelia`):

| What | Path | Permissions |
|---|---|---|
| SQLite DB + WAL + SHM | `/opt/casaaurelia/backend/casa_aurelia.db` (`-wal`, `-shm` alongside) | `casaaurelia:casaaurelia`, `0640` (hmm: dir `0750`) |
| Menu uploads | `/opt/casaaurelia/backend/uploads/menu/` | `casaaurelia:casaaurelia`, writable by service user |
| Backups staging | `/opt/casaaurelia/backend/backups/` | `casaaurelia:casaaurelia`, `0700` |
| Frontend build | `/opt/casaaurelia/frontend/dist/` | nginx `read` (world-readable) |

- WAL/SHM files are created next to the DB file by SQLite; they must live on
  the **same persistent disk**.
- All of the above must survive application restart, system reboot, deployment
  and application update (persistent volume, never ephemeral).
- nginx needs **read-only** access to `frontend/dist` and only proxied access to
  uploads via `/api`/`/uploads` through the application — never direct
  filesystem access to uploads or the DB.

---

## 10. Backup plan (initial, non-destructive)

Strategy per **`docs/Backup_Restore.md`** (SQLite online `.backup` + uploads
copy + `.env` copy), applied on the VPS:

1. **Frequency**: daily SQLite online backup + uploads copy; weekly off-server
   push; provider-level snapshot (Hetzner backups / DO snapshots) as a second
   net.
2. **Retention**: keep the last 7 daily and last 4 weekly backups locally in
   `/opt/casaaurelia/backend/backups/`; prune older local files. Off-server
   copies retained per the operator's policy.
3. **Backup location**: stage locally on the persistent volume, then copy
   **off-server** (rsync/`rclone` to a separate storage location —
   provider object storage or another machine). Off-server copies are required;
   a backup that only exists on the same disk is not a backup.
4. **Restoration procedure**: restore the latest `.backup` to a scratch database
   first, verify (`PRAGMA integrity_check`), then place it at the DB path with
   correct ownership (`chown casaaurelia:casaaurelia`, `chmod 600/640`), restore
   uploads mirror, recreate `.env` (secrets are regenerated/restored from the
   protected copy), restart the service.
5. **Verification**: weekly restore test on a scratch copy; integrity check;
   verify the off-server copy exists and is readable.

No destructive backup scripts are added and no existing data is deleted.

---

## 11. Resource / performance baseline (lightweight monitoring)

No monitoring stack is installed. Periodic checks (manual or a tiny operator
cron writing a log line):

| Check | Command |
|---|---|
| process | `systemctl is-active casaaurelia-backend` |
| nginx | `systemctl is-active nginx` ; `nginx -t` |
| CPU / load | `uptime` |
| RAM | `free -m` |
| disk | `df -h /opt /var` (alert at >80% used) |
| logs | `journalctl -u casaaurelia-backend --since "24 hours ago"` ; `tail -f /var/log/nginx/casaaurelia.*` |
| SQLite size | `du -sh /opt/casaaurelia/backend/casa_aurelia.db*` |
| uploads size | `du -sh /opt/casaaurelia/backend/uploads` |

Alert thresholds: disk utilisation > 80%, service down, backup-file mtime
stale (> ~26 h), excessive 5xx in nginx logs.

---

## 12. Environment / secret plan

All production secrets are **generated on the server** and stored only in
`/opt/casaaurelia/backend/.env` (owned `casaaurelia`, `chmod 600`), loaded via
`EnvironmentFile` by systemd. They are never generated or printed in the
repository, never committed, and never written into documentation.

| Variable | Source |
|---|---|
| `APP_ENV=production` | static |
| `SECRET_KEY` | generated on server (`python3 -c "import secrets; print(secrets.token_urlsafe(48))"`) |
| `ADMIN_PASSWORD` | generated on server (`secrets.token_urlsafe(20)`) |
| `DATABASE_URL` | `sqlite:////opt/casaaurelia/backend/casa_aurelia.db` (absolute) |
| `CORS_ORIGINS` | production origin (e.g. `https://hostname`) |
| `UPLOAD_DIR` | `/opt/casaaurelia/backend/uploads` (absolute, persistent) |
| `ALLOWED_HOSTS` | production hostname(s), comma-separated (required in production) |
| `VITE_SITE_URL` | production URL — set only at the frontend production build (public value, not a secret) |

Optional SMTP variables (`SMTP_*`, `NOTIFICATION_RECIPIENTS`) remain optional.
A template with placeholders already exists: `backend/.env.production.example`.

---

## 13. Domain / DNS plan (planning only)

- Eventually Casa Aurelia should use a canonical hostname (e.g.
  `casaaurelia.<tld>`) with a `www` alias. No domain is purchased or chosen
  yet.
- Required DNS: `A` record for the canonical hostname (and `www`) pointing at
  the VPS public IPv4; optional `AAAA` for IPv6.
- DNS is configured only once the VPS exists and the domain is purchased —
  **belongs to P2‑0F**.
- Timeline: pick the domain and point DNS at the VPS IP, then run the TLS
  process (§14). Do not configure DNS in P2‑0C.

---

## 14. TLS / HTTPS plan (planning only)

Deferred to P2‑0F unless operationally required earlier:

1. VPS exists.
2. DNS points to the VPS.
3. nginx configured (static frontend + SPA fallback + `/api` + `/uploads`
   proxying, security headers per `deploy/nginx-casaaurelia.conf.example`).
4. HTTP reachable (`curl -I http://hostname/`).
5. Certbot obtains the certificate (`certbot --nginx -d hostname -d www.hostname`).
6. HTTPS verified (`curl -I https://hostname/`).
7. HTTP → HTTPS redirect verified (`301`).
8. Secure cookie verified (refresh cookie `Secure`, `SameSite=Lax`, path
   `/api/auth`, over HTTPS).
9. HSTS verified (header on HTTPS responses; HTTP responses carry none).
10. Renewal tested (dry-run; auto-renewal unit/timer active).

No certificate is issued in P2‑0C.

---

## 15. Phase separation

| Phase | Scope |
|---|---|
| **P2‑0C** | Infrastructure provisioning (this plan; VPS decision + purchase + OS/host setup) |
| **P2‑0D** | Application deployment (clone, venv, build, alembic, seed, systemd, nginx) |
| **P2‑0E** | Production QA (health, pages, reservation flow, admin, uploads, E2E smoke) |
| **P2‑0F** | Domain + HTTPS (DNS, certificate, redirects, HSTS, cookie verification) |
| **P2‑0G** | SEO / search visibility (robots, sitemap, canonical/OG, search console) |

Phases are kept separate and are not combined.

---

## 16. Deployment prerequisites (for P2‑0D)

Before the application can be deployed:

- Always-on VPS provisioned (per §3) with Ubuntu 24.04 LTS; timezone
  `Europe/Rome` set; `unattended-upgrades` enabled.
- Non-root user `casaaurelia` created; SSH key-only access active; root and
  password SSH disabled (validated via a second session first).
- UFW enabled (SSH/HTTP/HTTPS only); port 8000 private.
- Persistent volume with the `/opt/casaaurelia/` skeleton created and owned by
  `casaaurelia`.
- Backups strategy understood and scheduled after first data exists (P2‑0D+).
- Production secrets generated on the server in `backend/.env` (`0600`).