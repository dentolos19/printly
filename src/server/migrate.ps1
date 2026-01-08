param(
  [Parameter(Mandatory = $false)]
  [string]$MigrationName
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

if ([string]::IsNullOrWhiteSpace($MigrationName)) {
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
