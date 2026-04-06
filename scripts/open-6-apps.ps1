param(
    [string]$AppPath = ".\src-tauri\target\release\Plano de Corte.exe",
    [string]$SharedStorePath = "V:\8. CONTROLE DE PRODUÇÃO\3. DADOS\.plan_slice",
    [string]$ProductionBasePath = "V:\8. CONTROLE DE PRODUÇÃO",
    [string]$MachinePrefix = "Bodor",
    [int]$Count = 6
)

if (-not (Test-Path -LiteralPath $AppPath)) {
    throw "Aplicativo nao encontrado em: $AppPath"
}

for ($i = 1; $i -le $Count; $i++) {
    $machineName = "$MachinePrefix$i"
    $command = @(
        "`$env:APP_ENV='production'",
        "`$env:MACHINE_NAME='$machineName'",
        "`$env:APP_SHARED_STORE_PATH='$SharedStorePath'",
        "`$env:PRODUCTION_BASE_PATH='$ProductionBasePath'",
        "& '$AppPath'"
    ) -join "; "

    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        $command
    )
}
