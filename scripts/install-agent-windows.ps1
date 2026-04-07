#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs the monitoring agent as a Windows service.

.PARAMETER ServerUrl
    The URL of the monitoring server.

.PARAMETER Token
    The agent token provided by the server.

.PARAMETER InstallDir
    Installation directory. Default: C:\monitoring-agent
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$ServerUrl,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [Parameter(Mandatory = $false)]
    [string]$InstallDir = "C:\monitoring-agent"
)

$ErrorActionPreference = "Stop"

$ServiceName = "MonitoringAgent"
$BinaryUrl = "$ServerUrl/agent/download/windows/amd64/monitoring-agent.exe"
$BinaryPath = Join-Path $InstallDir "monitoring-agent.exe"
$ConfigPath = Join-Path $InstallDir "config.env"

Write-Host "==> Creating installation directory: $InstallDir"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "==> Downloading monitoring agent..."
try {
    Invoke-WebRequest -Uri $BinaryUrl -OutFile $BinaryPath -UseBasicParsing
    Write-Host "    Downloaded to $BinaryPath"
} catch {
    Write-Error "Failed to download agent from $BinaryUrl : $_"
    exit 1
}

Write-Host "==> Writing configuration..."
$configContent = @"
SERVER_URL=$ServerUrl
AGENT_TOKEN=$Token
COLLECT_INTERVAL=10
"@
Set-Content -Path $ConfigPath -Value $configContent -Encoding UTF8

$acl = Get-Acl $ConfigPath
$acl.SetAccessRuleProtection($true, $false)
$adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "BUILTIN\Administrators", "FullControl", "Allow"
)
$acl.SetAccessRule($adminRule)
# Grant SYSTEM read access so the service account can read the config
$systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "NT AUTHORITY\SYSTEM", "Read", "Allow"
)
$acl.SetAccessRule($systemRule)
Set-Acl -Path $ConfigPath -AclObject $acl

Write-Host "    Config saved to $ConfigPath"

Write-Host "==> Stopping existing service (if any)..."
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    & sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host "==> Registering Windows service..."

# Build environment variable string for service
$envVars = Get-Content $ConfigPath | ForEach-Object {
    $parts = $_ -split "=", 2
    if ($parts.Length -eq 2) { "$($parts[0])=$($parts[1])" }
}

# Use sc.exe to create the service
$binPathWithEnv = "`"$BinaryPath`""
& sc.exe create $ServiceName `
    binPath= $binPathWithEnv `
    start= auto `
    DisplayName= "Monitoring Agent" | Out-Null

# Set description
& sc.exe description $ServiceName "Infrastructure monitoring agent" | Out-Null

# Set environment variables via registry
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName"
$envArray = $envVars
Set-ItemProperty -Path $regPath -Name "Environment" -Value $envArray -Type MultiString

Write-Host "==> Starting service..."
Start-Service -Name $ServiceName

$service = Get-Service -Name $ServiceName
Write-Host ""
Write-Host "✓ Monitoring agent installed successfully!"
Write-Host "  Service name: $ServiceName"
Write-Host "  Status: $($service.Status)"
Write-Host "  Check status: Get-Service -Name $ServiceName"
Write-Host "  View logs: Get-EventLog -LogName Application -Source $ServiceName -Newest 20"
