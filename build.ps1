# Собирает игру из src/ в два файла:
#   nightshift.html — тело страницы (для публикации артефактом)
#   index.html      — самодостаточная страница (открыть двойным кликом)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "src"

$read = { param($n) [System.IO.File]::ReadAllText((Join-Path $src $n)) }

$shell = & $read "00-shell.html"
$js = @("01-engine.js", "02-content.js", "03-game.js", "04-render.js", "05-ui.js") |
    ForEach-Object { & $read $_ }

$body = $shell + "`r`n<script>`r`n" + ($js -join "`r`n") + "`r`n</" + "script>`r`n"

$head = @'
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Night survivors — HTML5 survivors-like: продержись 15 минут в неоновом квартале.">
</head>
<body>
'@
$page = $head + "`r`n" + $body + "`r`n</body>`r`n</html>`r`n"

# Переводы строк приводим к LF: git хранит файлы именно так, и иначе
# собранный index.html вечно выглядел бы изменённым — и на твоей машине,
# и в проверке на раннере.
$body = $body -replace "`r`n", "`n"
$page = $page -replace "`r`n", "`n"

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $root "nightshift.html"), $body, $utf8)
[System.IO.File]::WriteAllText((Join-Path $root "index.html"), $page, $utf8)

"nightshift.html : {0:N0} байт" -f (Get-Item (Join-Path $root "nightshift.html")).Length
"index.html      : {0:N0} байт" -f (Get-Item (Join-Path $root "index.html")).Length
