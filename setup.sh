#!/bin/bash
# Quick Setup Script para Restaurante POS

echo "🍽️  Restaurante POS - Setup Inicial"
echo "===================================="
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "Descarga de: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error al instalar dependencias"
    exit 1
fi
echo "✅ Dependencias instaladas"
echo ""

# Crear .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado"
    echo "⚠️  IMPORTANTE: Edita .env y configura contraseñas"
else
    echo "✅ .env ya existe"
fi
echo ""

# Crear base de datos de usuarios
echo "🗄️  Creando base de datos de usuarios..."
node crear_usuarios_db.js
if [ $? -ne 0 ]; then
    echo "❌ Error al crear usuarios DB"
    exit 1
fi
echo "✅ Base de datos de usuarios creada"
echo ""

# Crear directorio de uploads
mkdir -p public/uploads
echo "✅ Directorio de uploads creado"
echo ""

echo "🎉 Setup completado!"
echo ""
echo "Próximos pasos:"
echo "1. Edita .env y cambia las contraseñas"
echo "2. Ejecuta: npm run dev"
echo "3. Abre: http://localhost:3000"
echo ""
echo "Documenta ción:"
echo "- Guía de deployment: DEPLOYMENT.md"
echo "- Problemas críticos: CRITICAL_ISSUES.md"
echo "- Seguridad: SECURITY.md"
