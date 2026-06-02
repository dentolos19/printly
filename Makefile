.PHONY: setup start migrate check

setup:
	cd src/app && bun install
	cd src/server && dotnet restore

start:
	cd src/app && bun run dev & \
	cd src/server && dotnet run & \
	wait

migrate:
	dotnet tool restore
	cd src/server && dotnet ef database update

check:
	cd src/app && bun run check
	cd src/server && dotnet format
