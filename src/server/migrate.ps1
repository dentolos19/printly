param(
  [Parameter(Mandatory = $false)]
  [string]$MigrationName,
  [Parameter(Mandatory = $false)]
  [switch]$Force
)

Write-Host "Checking for production environment..."

if (Test-Path ".env.production") {
  Write-Host "Loading production environment..."
  Get-Content ".env.production" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}
else {
  Write-Host "No production environment found."
  if (![string]::IsNullOrWhiteSpace($MigrationName)) {
    $currentDatabaseUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
    if ([string]::IsNullOrEmpty($currentDatabaseUrl)) {
      $defaultPostgresUrl = "postgresql://user:password@localhost:5432/printly"
      [Environment]::SetEnvironmentVariable("DATABASE_URL", $defaultPostgresUrl, "Process")
    }
  }
}

if ($Force) {
  Write-Host "Force flag detected. Dropping all tables..."
  $databaseUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")

  if ([string]::IsNullOrEmpty($databaseUrl)) {
    Write-Host "Error: DATABASE_URL environment variable is not set."
    exit 1
  }

  $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
  if ($null -eq $psqlCommand) {
    Write-Host "Error: psql is not installed or not in PATH. Please install PostgreSQL client tools."
    exit 1
  }

  psql $databaseUrl -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"

  if ($LASTEXITCODE -eq 0) {
    Write-Host "All tables dropped successfully. Applying all migrations..."
    dotnet ef database update
  }
  else {
    Write-Host "Failed to drop tables with exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
  }
}
elseif ([string]::IsNullOrWhiteSpace($MigrationName)) {
  Write-Host "Running migrations..."
  dotnet ef database update
}
else {
  Write-Host "Adding migration: $MigrationName"
  dotnet ef migrations add $MigrationName
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "Operation completed successfully!"
}
else {
  Write-Host "Operation failed with exit code: $LASTEXITCODE"
  exit $LASTEXITCODE
}
