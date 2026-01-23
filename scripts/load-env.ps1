# PowerShell script to load .env file variables
# Usage: . .\scripts\load-env.ps1

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Warning ".env file not found in current directory"
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        # Remove quotes if present
        if ($value -match '^["''](.*)["'']$') {
            $value = $matches[1]
        }
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

Write-Host "Environment variables loaded from .env" -ForegroundColor Green
