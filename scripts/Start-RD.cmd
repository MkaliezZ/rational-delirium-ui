@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
  echo Node.js 24 or newer is required.
  pause
  exit /b 1
)
set "RD_KNOWLEDGE=%~1"
if not defined RD_KNOWLEDGE set "RD_KNOWLEDGE=%~dp0knowledge"
if not exist "%RD_KNOWLEDGE%\.rd\workspace.json" (
  node "%~dp0rd.mjs" init --root "%RD_KNOWLEDGE%"
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Rational Delirium: http://127.0.0.1:4399
echo Keep this window open while using the knowledge library. Ctrl+C stops it.
start "" "http://127.0.0.1:4399"
node "%~dp0rd.mjs" serve --root "%RD_KNOWLEDGE%" --port 4399
if errorlevel 1 pause
