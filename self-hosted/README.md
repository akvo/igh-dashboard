# Self-Hosted Deployment

Deploy the IGH Dashboard on your own server using Docker Compose with Traefik as a reverse proxy and automatic HTTPS via Let's Encrypt.

## Prerequisites

- Docker and Docker Compose
- A domain name pointing to your server

## Setup

### 1. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set the required values:

| Variable | Description | Example |
|----------|-------------|---------|
| `WEBDOMAIN` | Your domain name | `dashboard.example.com` |
| `NEXT_PUBLIC_GRAPHQL_ENDPOINT` | GraphQL API path | `/api` |
| `TRAEFIK_CERTIFICATESRESOLVERS_MYRESOLVER_ACME_EMAIL` | Email for Let's Encrypt | `admin@example.com` |
| `APP_PORT` | HTTP port | `80` |
| `APP_SSL_PORT` | HTTPS port | `443` |
| `IS_PRODUCTION` | `true` on production hosts only (see below) | `false` |

### 2. Database handling

The `star_schema.db` SQLite file is mounted into the backend container
at `/app/data/star_schema.db` via the `./data/` directory.

- **Staging (`IS_PRODUCTION=false` or unset):** `install.sh` and
  `update.sh` automatically copy the bundled
  `../backend/star_schema.db` into `./data/` on every run, so the
  staging DB tracks whatever is committed to the repo.
- **Production (`IS_PRODUCTION=true`):** the scripts skip the copy.
  The gold `star_schema.db` is delivered by the Airflow pipeline in
  [`igh-airflow-data-deployment-dag`](../../igh-airflow-data-deployment-dag),
  which writes `star_schema.db.new` and atomically renames it; the
  backend hot-reloads on the inode change.

### 3. Install and start

```bash
./install.sh
```

This pulls the latest code, seeds `./data/star_schema.db` when
`IS_PRODUCTION` is not `true`, builds the Docker images, and starts
all services.

## Services

The Docker Compose stack runs the following services:

| Service | Description |
|---------|-------------|
| **traefik** | Reverse proxy with automatic HTTPS (Let's Encrypt) |
| **frontend** | Next.js dashboard UI |
| **backend** | Apollo GraphQL API serving data from `star_schema.db` |
| **mainnetwork** | Shared network container for inter-service communication |

Traefik routes requests as follows:

- `https://<WEBDOMAIN>/` → frontend (port 3000)
- `https://<WEBDOMAIN>/api/*` → backend (port 4000), with `/api` prefix stripped

## Management Scripts

| Script | Description |
|--------|-------------|
| `./install.sh` | Pull latest code, build images, and start services |
| `./update.sh` | Pull latest code, rebuild images, and restart services |
| `./restart.sh` | Restart all services without rebuilding |
