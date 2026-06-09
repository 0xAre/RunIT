# Windows-safe Firebase deploy (symlink EPERM workaround)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (Test-Path .firebase) {
  Remove-Item -Recurse -Force .firebase
}

node -r "./scripts/symlink-shim.cjs" "$env:APPDATA\npm\node_modules\firebase-tools\lib\bin\firebase.js" deploy --only "hosting,firestore:rules" --project gen-lang-client-0688034783
