#!/bin/bash
set -euv

#Git Pull
git pull

# Load .env so IS_PRODUCTION is visible to this script.
set -a
# shellcheck source=/dev/null
[ -f ./.env ] && . ./.env
set +a

# Seed the staging database from the bundled file. On production hosts
# the gold star_schema.db is delivered by the Airflow pipeline, so
# IS_PRODUCTION=true must be set in .env to prevent overwriting it.
mkdir -p ./data
if [ "${IS_PRODUCTION:-false}" != "true" ]; then
  cp ../backend/star_schema.db ./data/star_schema.db
fi

#Rebuild App
docker compose build --no-cache

#Restart Service
docker compose stop && docker compose up -d
