@echo off
setlocal

:: 1. Definir mensajes por defecto (Inglés)
set "MSG_TITLE=POS Server"
set "MSG_START=Starting the system..."
set "MSG_WARN=Please do not close this window."
set "MSG_DB=Checking database updates..."

:: 2. Detectar idioma del sistema
for /f "tokens=3" %%a in ('reg query "HKCU\Control Panel\International" /v "LocaleName" 2^>nul') do set "LCODE=%%a"
if defined LCODE set "LANG_SHORT=%LCODE:~0,2%"

:: 3. Configurar mensajes según idioma detectado

:: Español
if /i "%LANG_SHORT%"=="es" (
    set "MSG_TITLE=Servidor POS"
    set "MSG_START=Iniciando el sistema..."
    set "MSG_WARN=Por favor, no cierres esta ventana."
    set "MSG_DB=Verificando actualizaciones de base de datos..."
)

:: Francés
if /i "%LANG_SHORT%"=="fr" (
    set "MSG_TITLE=Serveur POS"
    set "MSG_START=Démarrage du système..."
    set "MSG_WARN=Veuillez ne pas fermer cette fenêtre."
    set "MSG_DB=Vérification des mises à jour de la base de données..."
)

:: Portugués
if /i "%LANG_SHORT%"=="pt" (
    set "MSG_TITLE=Servidor POS"
    set "MSG_START=Iniciando o sistema..."
    set "MSG_WARN=Por favor, não feche esta janela."
    set "MSG_DB=Verificando atualizações do banco de dados..."
)

:: Japonés (Requiere UTF-8)
if /i "%LANG_SHORT%"=="ja" (
    chcp 65001 >nul
    set "MSG_START=システムを起動しています..."
    set "MSG_WARN=このウィンドウを閉じないでください。"
    set "MSG_DB=データベースの更新を確認しています..."
)

:: Chino (Requiere UTF-8)
if /i "%LANG_SHORT%"=="zh" (
    chcp 65001 >nul
    set "MSG_START=正在启动系统..."
    set "MSG_WARN=请勿关闭此窗口。"
    set "MSG_DB=正在检查数据库更新..."
)

:: 4. Ejecutar
title %MSG_TITLE%
echo %MSG_START%
echo %MSG_WARN%
cd /d "%~dp0"
echo %MSG_DB%

:: Verificar si existe node.exe localmente (instalación portable)
set "NODE_CMD=node"
if exist "%~dp0node.exe" set "NODE_CMD=%~dp0node.exe"

"%NODE_CMD%" crear_usuarios_db.js
"%NODE_CMD%" actualizar_db.js
"%NODE_CMD%" server.js
pause