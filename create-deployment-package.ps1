# Create deployment package excluding unnecessary files
$excludePatterns = @(
    "node_modules",
    ".next",
    ".git", 
    "*.log",
    ".env.local",
    "*.tmp"
)

$sourceDir = "."
$destinationZip = "salon-management-system-for-vercel.zip"

# Get all files except excluded ones
$filesToInclude = Get-ChildItem -Path $sourceDir -Recurse | Where-Object {
    $file = $_
    $shouldExclude = $false
    
    foreach ($pattern in $excludePatterns) {
        if ($file.FullName -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }
    
    return -not $shouldExclude -and -not $file.PSIsContainer
}

Write-Host "Files to include: $($filesToInclude.Count)"
Write-Host "Creating deployment package..."

# Create temp directory structure
$tempDir = "salon-management-temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files maintaining structure
foreach ($file in $filesToInclude) {
    $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\")
    $destinationPath = Join-Path $tempDir $relativePath
    $destinationFolder = Split-Path $destinationPath -Parent
    
    if (-not (Test-Path $destinationFolder)) {
        New-Item -ItemType Directory -Path $destinationFolder -Force | Out-Null
    }
    
    Copy-Item $file.FullName $destinationPath
}

# Create ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $destinationZip -Force

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host "Created: $destinationZip"
Write-Host "Ready for GitHub upload!"