# Diddit staging

A second copy of Diddit at **https://home-staging.st44.no**, with its own empty
database, for testing registration and family setup from scratch (ST-1357). It
runs on the same host as live and shares nothing with it.

|            | live                                           | staging                                                             |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| address    | home.st44.no                                   | home-staging.st44.no (basic auth, `noindex`)                        |
| stack      | `/srv/st44-home/infra`, network `st44_default` | `~/st44-staging` (deploy user), project and network `st44-staging`  |
| containers | `st44-db`, `st44-backend`, ...                 | `st44-staging-db`, `st44-staging-backend`, ..., `st44-staging-gate` |
| database   | volume of the live project                     | volume `st44-staging_postgres_data`                                 |
| secrets    | `JWT_SECRET`, host `.env`                      | `STAGING_JWT_SECRET`, `STAGING_DB_PASSWORD`, `STAGING_BASIC_AUTH`   |
| e-mail     | SendGrid                                       | none, see below                                                     |
| deploy     | push to `main` (`deploy.yml`)                  | by hand (`deploy-staging.yml`)                                      |
| host port  | none (nginx reaches the containers by name)    | 3210 (the gate only; 3200 is taken on the host)                     |

Files: `infra/staging/docker-compose.yml`, `infra/staging/gate.conf.template`,
`.github/workflows/deploy-staging.yml`.

## Deploy a branch to staging

```bash
gh workflow run deploy-staging.yml -f ref=<branch>
```

Or Actions → **Deploy staging** → Run workflow, and type the branch. Any branch,
tag or commit works. The workflow builds the three images for that commit (tagged
with its SHA only; `:latest` stays live's), copies the two staging files to
`~/st44-staging` on the host, starts the stack, runs the migrations, and checks
that staging answers and that live's `/health` is still 200. Data in the staging
database is kept between deploys.

## Reset staging to an empty database

```bash
gh workflow run deploy-staging.yml -f ref=main -f reset=true
```

This runs `docker compose down --volumes` for the staging project only, then starts
it again: the database is created new from `init.sql` plus the migrations, with no
users and no families. Live is not touched.

## Getting in

The browser asks for a user name and password (basic auth). They are the
`STAGING_BASIC_AUTH` secret; Stig has them. After that, Diddit works as usual:
register a new parent with e-mail and password. Google sign-in is not set up for
the staging address.

Why there is also a cookie: the app sends its login as `Authorization: Bearer`,
the same header basic auth uses, so `/api/` cannot be behind basic auth. The page
answer sets an HttpOnly cookie `st44_staging_gate`, and `/api/` refuses requests
without it. `/health` and `/robots.txt` are open; `/health` says only "ok".

Every answer has `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private,
no-store` (so Cloudflare keeps no copy), and `/robots.txt` disallows everything.

## E-mail on staging

Staging has no SendGrid key (it is set empty in the compose file), so **no e-mail
leaves staging**:

- **Password reset:** the e-mail is written to the backend log instead, with the
  reset link. Read it on the host:

  ```bash
  docker logs st44-staging-backend 2>&1 | grep -A4 'PASSWORD RESET EMAIL'
  ```

- **Invitations:** the e-mail is written to the backend log instead, with the
  accept link:

  ```bash
  docker logs st44-staging-backend 2>&1 | grep 'Invitation email'
  ```
- There is no e-mail verification step in Diddit today.

## One-time setup

Done once; the workflow fails with a clear message until it is.

1. **Repository secrets** (Settings → Secrets and variables → Actions):
   - `STAGING_DB_PASSWORD`: a new random password, not live's.
     `openssl rand -base64 32`
   - `STAGING_JWT_SECRET`: a new random secret, at least 32 characters, not live's.
     `openssl rand -base64 48`
   - `STAGING_BASIC_AUTH`: one htpasswd line, `<user>:<apr1 hash>`, e.g.
     `printf 'stig:%s\n' "$(openssl passwd -apr1 '<password>')"`.
     nginx reads apr1 itself, so it does not depend on the container's libc.
2. **DNS:** `home-staging.st44.no` pointing at the host, the same way as
   `home.st44.no` (Cloudflare). One level under `st44.no` on purpose:
   Cloudflare's free certificate covers `*.st44.no` but not
   `*.home.st44.no`, so `staging.home.st44.no` would need a paid or separate
   certificate.
3. **Host TLS proxy:** a site for `home-staging.st44.no` that forwards to
   `http://host.docker.internal:3210` with one `location /` (no upstreams), passing the
   `Host` and `CF-Visitor` headers through. No auth in the proxy; the gate does it.
4. Run the workflow once with `reset=true`.

## Removing staging (undo)

On the host, as the deploy user:

```bash
cd ~/st44-staging && docker compose -p st44-staging down --volumes --remove-orphans
rm -rf ~/st44-staging
```

Then remove the proxy site and the DNS record for `home-staging.st44.no`, delete
the three `STAGING_*` secrets, and delete `.github/workflows/deploy-staging.yml`
and `infra/staging/`. Images tagged by staging runs in GHCR can stay; nothing runs
them. Live is not affected by any of these steps.
