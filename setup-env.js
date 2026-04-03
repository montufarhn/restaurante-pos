#!/usr/bin/env node
// Script para crear archivo .env si no existe

const fs = require('fs');
const path = require('path');
require('crypto').randomBytes(32).toString('hex');

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
    console.log('✅ Archivo .env ya existe. Continuando...');
    process.exit(0);
}

const crypto = require('crypto');
const secretKey = crypto.randomBytes(32).toString('hex');

const envContent = `# === Configuración de Restaurante POS ===

# Entorno
NODE_ENV=development
PORT=3000

# Base de Datos - Local (SQLite)
USE_LOCAL_DB=true
DB_PATH=./restaurante.db
USERS_DB_PATH=./usuarios.db

# Base de Datos - Producción (Supabase PostgreSQL)
# Descomenta cuando uses Supabase
# SUPABASE_ENABLED=true
# DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# Seguridad
SESSION_SECRET=${secretKey}
SESSION_TIMEOUT_HOURS=8
SALT_ROUNDS=10

# Admin Inicial (solo para primer setup)
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=changeme123

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
NO_OPEN=false
`;

fs.writeFileSync(envPath, envContent);
console.log('✅ Archivo .env creado exitosamente');
console.log('⚠️  IMPORTANTE: Edita .env y cambia SESSION_SECRET y contraseñas');
process.exit(0);
