# 本地预览：启动零依赖静态服务器并打开浏览器
# 用法：右键「使用 PowerShell 运行」，或在终端执行 .\start-local.ps1

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$url = 'http://localhost:8000'
Write-Host "雅思学习台 · 本地预览"
Write-Host "  $url"
Write-Host "按 Ctrl+C 停止。"

$server = Start-Process -FilePath 'node' -ArgumentList 'serve.js' -PassThru -NoNewWindow
Start-Sleep -Milliseconds 900
Start-Process $url

try {
  Wait-Process -Id $server.Id
} finally {
  if (-not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
