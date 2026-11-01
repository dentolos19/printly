set dotenv-load
set dotenv-filename := "src/app/" + dotenv_file
set dotenv-override

environment := ""
dotenv_file := if environment == "" { ".env" } else { ".env." + environment }

setup mode="": install compose
    just --no-deps environment={{ quote(environment) }} migrate
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
    if [ "${CI:-false}" != "true" ]; then docker compose up --detach --wait; fi

decompose:
    if [ "${CI:-false}" != "true" ]; then docker compose down; fi

build:
    cd src/app && bun run build
    cd src/server && dotnet build --configuration Release --no-restore

check:
    cd src/app && bun lint --fix && bun fmt && bun check --no-script
    cd src/server && dotnet format

migrate: compose
    dotnet tool restore
    cd src/server && dotnet ef database update

deploy: install build
    #!/usr/bin/env bash
    set -euo pipefail
    test -f {{ quote("src/app/" + dotenv_file) }}
    CI=true just environment={{ quote(environment) }} migrate
    cd src/app
    bun run deploy --prebuilt --secrets-file {{ quote(dotenv_file) }}
