param(
    [Parameter(Mandatory=$false)]
    [string]$MigrationName
)

Write-Host "Checking for environment file..." -ForegroundColor Cyan

# Load environment variables if file exists
if (Test-Path ".env.production") {
    Write-Host "Loading environment variables from production environment file..." -ForegroundColor Cyan
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  Loaded: $key" -ForegroundColor Gray
        }
    }
    Write-Host ""
} else {
    Write-Host "Running in Dev Mode (no .env.production found, using default SQLite connection)" -ForegroundColor Yellow
    Write-Host ""
}

# Run migrations or add migration
if ([string]::IsNullOrWhiteSpace($MigrationName)) {
    Write-Host "Running migrations..." -ForegroundColor Yellow
    dotnet ef database update
} else {
    Write-Host "Adding migration: $MigrationName" -ForegroundColor Yellow
    dotnet ef migrations add $MigrationName
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Operation completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Operation failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
