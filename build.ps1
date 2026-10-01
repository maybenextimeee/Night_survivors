# Собирает игру из src/ в две версии:
#   index.html                       — для GitHub Pages и запуска с диска (без SDK)
#   build/yandex/index.html + .zip   — для Яндекс Игр: та же игра + тег SDK
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "src"

$read = { param($n) [System.IO.File]::ReadAllText((Join-Path $src $n)) }

$shell = & $read "00-shell.html"
$js = @("01-engine.js", "02-content.js", "03-game.js", "04-render.js", "05-ui.js", "06-platform.js", "07-touch.js", "08-i18n.js", "09-boot.js") |
    ForEach-Object { & $read $_ }

$body = $shell + "`r`n<script>`r`n" + ($js -join "`r`n") + "`r`n</" + "script>`r`n"

# {SDK} заменяется на тег SDK только в сборке для Яндекса.
$head = @'
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="description" content="Night survivors — HTML5 survivors-like: продержись 15 минут в неоновом квартале.">
{SDK}</head>
<body>
'@
$tail = "`r`n</body>`r`n</html>`r`n"

# Путь к SDK — относительный: так требует документация для игр,
# загруженных архивом на сервер Яндекса.
$sdkTag = "<!-- Yandex Games SDK -->`r`n<script src=`"/sdk.js`"></script>`r`n"

$web = $head.Replace("{SDK}", "") + "`r`n" + $body + $tail
$ya  = $head.Replace("{SDK}", $sdkTag) + "`r`n" + $body + $tail

# Переводы строк приводим к LF: git хранит файлы именно так, и иначе
# собранный index.html вечно выглядел бы изменённым — и на твоей машине,
# и в проверке на раннере.
$web = $web -replace "`r`n", "`n"
$ya  = $ya -replace "`r`n", "`n"

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $root "index.html"), $web, $utf8)

$yaDir = Join-Path $root "build/yandex"
New-Item -ItemType Directory -Force -Path $yaDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $yaDir "index.html"), $ya, $utf8)

# Архив для Консоли: index.html в корне, без пробелов и кириллицы в именах.
$zip = Join-Path $root "build/night-survivors-yandex.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $yaDir "*") -DestinationPath $zip

"index.html                       : {0:N0} байт" -f (Get-Item (Join-Path $root "index.html")).Length
"build/yandex/index.html          : {0:N0} байт" -f (Get-Item (Join-Path $yaDir "index.html")).Length
"build/night-survivors-yandex.zip : {0:N0} байт" -f (Get-Item $zip).Length
