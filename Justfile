setup:
    cd src/app && bun install
    cd src/server && dotnet restore
    just compose
    just migrate

start: compose
    cd src/app && bun run dev & \
    cd src/server && dotnet run & \
    wait
    just decompose

compose:
    docker compose up --detach --wait

decompose:
    docker compose down

check:
    cd src/app && bun run check
    cd src/server && dotnet format

migrate:
    dotnet tool restore
    cd src/server && dotnet ef database update
