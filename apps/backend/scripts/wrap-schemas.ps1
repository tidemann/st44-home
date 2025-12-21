# Script to wrap all exported schemas with stripResponseValidation
# Usage: .\wrap-schemas.ps1

$files = @('tasks.ts', 'households.ts', 'children.ts', 'assignments.ts')
$schemasDir = Join-Path $PSScriptRoot '..\src\schemas'

foreach ($file in $files) {
    $filePath = Join-Path $schemasDir $file
    Write-Host "Processing $file..."
    
    $content = Get-Content $filePath -Raw
    
    # Pattern: export const NAME = ...
    # Replace with: const NAMEBase = ...
    $pattern = 'export const (\w+) = '
    $replacement = 'const $1Base = '
    $content = $content -replace $pattern, $replacement
    
    # Find all schema names
    $schemaNames = @()
    $matches = [regex]::Matches($content, 'const (\w+)Base = ')
    foreach ($match in $matches) {
        $schemaNames += $match.Groups[1].Value
    }
    
    # Add export statements at the end
    $exports = "`n`n// Export schemas with conditional response validation stripping`n"
    foreach ($name in $schemaNames) {
        $exports += "export const $name = stripResponseValidation(${name}Base);`n"
    }
    
    $content += $exports
    
    Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  Processed $($schemaNames.Count) schemas"
}

Write-Host "`nAll schemas wrapped!"
