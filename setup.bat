@echo off
REM Quick Setup Script para Restaurante POS (Windows)

echo 🍽️  Restaurante POS - Setup Inicial
echo ====================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no está instalado
    echo Descarga de: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js: %NODE_VERSION%
echo ✅ npm: %NPM_VERSION%
echo.

REM Instalar dependencias
echo 📦 Instalando dependencias...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error al instalar dependencias
    pause
    exit /b 1
)
echo ✅ Dependencias instaladas
echo.

REM Crear .env si no existe
if not exist .env (
    echo 📝 Creando archivo .env...
    copy .env.example .env
    echo ✅ Archivo .env creado
    echo ⚠️  IMPORTANTE: Edita .env y configura contraseñas
) else (
    echo ✅ .env ya existe
)
echo.

REM Crear base de datos de usuarios
echo 🗄️  Creando base de datos de usuarios...
call node crear_usuarios_db.js
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error al crear usuarios DB
    pause
    exit /b 1
)
echo ✅ Base de datos de usuarios creada
echo.

REM Crear directorio de uploads
if not exist public\uploads mkdir public\uploads
echo ✅ Directorio de uploads creado
echo.

echo 🎉 Setup completado!
echo.
echo Próximos pasos:
echo 1. Edita .env y cambia las contraseñas
echo 2. Ejecuta: npm run dev
echo 3. Abre: http://localhost:3000
echo.
echo Documentación:
echo - Guía de deployment: DEPLOYMENT.md
echo - Problemas críticos: CRITICAL_ISSUES.md
echo - Seguridad: SECURITY.md
echo.
pause
