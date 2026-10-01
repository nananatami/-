param([string]$Url, [string]$Destination)
$ErrorActionPreference = 'Stop'
Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing -TimeoutSec 30
