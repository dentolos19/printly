.PHONY: setup start compose decompose check migrate

setup:
	cd src/app && bun install
	cd src/server && dotnet restore
	$(MAKE) migrate

start: compose
	cd src/app && bun run dev & \
	cd src/server && dotnet run & \
	wait

compose:
	docker compose up --detach --wait

decompose:
	docker compose down

check:
	cd src/app && bun run check
	cd src/server && dotnet format

migrate: compose
	dotnet tool restore
	cd src/server && dotnet ef database update
