$ErrorActionPreference = "Stop"

$replacements = @{
  [string][char]0x2013 = '–'   # en dash
  [string][char]0x2014 = '—'   # em dash
  [string][char]0x2019 = '’'   # right single quote
  [string][char]0x201C = '“'   # left double quote
  [string][char]0x201D = '”'   # right double quote
  [string][char]0x00A7 = '§'   # section symbol
  [string][char]0x2026 = '…'   # ellipsis
  [string][char]0x2122 = '™'   # trademark
}

$files = Get-ChildItem -Path . -Recurse -Include *.html

foreach ($file in $files) {
  $path = $file.FullName
  $original = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  $updated = $original

  foreach ($bad in $replacements.Keys) {
    $updated = $updated -replace [regex]::Escape($bad), $replacements[$bad]
  }

  if ($original -ne $updated) {
    Set-Content -LiteralPath $path -Value $updated -Encoding UTF8
    Write-Host "✅ Fixed encoding in: $path"
  }
}
