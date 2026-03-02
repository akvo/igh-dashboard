# Self-Hosted Deployment

Deploy the IGH Dashboard on your own server using Docker Compose with Traefik as a reverse proxy and automatic HTTPS via Let's Encrypt.

## Prerequisites

- Docker and Docker Compose
- A domain name pointing to your server
- The `star_schema.db` SQLite database file

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

### 2. Copy the database

Create the `data/` folder and copy `star_schema.db` from the `backend/` folder into it:

```bash
mkdir -p data
cp ../backend/star_schema.db ./data/
```

This database is mounted into the backend container at `/app/data/star_schema.db`.

### 3. Install and start

```bash
./install.sh
```

This pulls the latest code, builds the Docker images, and starts all services.

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
