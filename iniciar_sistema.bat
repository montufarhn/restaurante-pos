@echo off
title Servidor
echo Iniciando el sistema...
echo Por favor, no cierres esta ventana.
cd /d "%~dp0"
echo Verificando actualizaciones de base de datos...
node actualizar_db.js
npm start