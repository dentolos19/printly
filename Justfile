set dotenv-load

setup mode="": install
    just compose
    just migrate
    if [ "{{ mode }}" != "prerun" ]; then just decompose; fi

install:
    cd src/app && bun install --frozen-lockfile
    cd src/server && dotnet restore

start: compose
    cd src/app && bun run dev & \
    cd src/server && dotnet run & \
    wait
    just decompose

compose:
    docker compose up --detach --wait database storage
    docker compose run --rm storage-setup

decompose:
    docker compose down

build:
    cd src/app && bun run build
    cd src/server && dotnet build --configuration Release --no-restore

check:
    cd src/app && bun run check
    cd src/server && dotnet format

migrate:
    dotnet tool restore
    cd src/server && dotnet ef database update

deploy: install build
    #!/usr/bin/env bash
    set -euo pipefail
    cd src/app
    names=(
        AWS_ACCESS_KEY_ID
        AWS_ENDPOINT_URL_S3
        AWS_REGION
        AWS_SECRET_ACCESS_KEY
        SECRET_KEY
        APP_URL
        DATABASE_URL
        GOOGLE_CLIENT_ID
        GOOGLE_CLIENT_SECRET
        LIVEKIT_URL
        LIVEKIT_API_KEY
        LIVEKIT_API_SECRET
        OPENROUTER_API_KEY
        OPENROUTER_TITLE
        OPENROUTER_REFERER
        OPENROUTER_MODEL
        OPENROUTER_IMAGE_MODEL
        ELEVENLABS_API_KEY
        ELEVENLABS_AGENT_ID
        RESEND_API_KEY
        RESEND_FROM_EMAIL
    )
    for name in "${names[@]}"; do if [[ -z "${!name:-}" ]]; then echo "Missing worker secret value: $name" >&2; exit 1; fi; done
    node -e 'process.stdout.write(JSON.stringify(Object.fromEntries(process.argv.slice(1).map((name) => [name, process.env[name]]))))' "${names[@]}" | bun wrangler secret bulk
    bun wrangler deploy
