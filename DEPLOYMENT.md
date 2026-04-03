# 📱 Guía de Deployment - Restaurante POS

## 📋 Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Configuración Local](#configuración-local)
3. [Deployment a Render.com](#deployment-a-rendercom)
4. [Configuración de Supabase](#configuración-de-supabase)
5. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Requisitos Previos

### Herramientas Necesarias
- Git: https://git-scm.com/
- Node.js >= 14: https://nodejs.org/
- Cuenta en GitHub: https://github.com/
- Cuenta en Render: https://render.com/
- Cuenta en Supabase: https://supabase.com/

### Verificar Instalación
```bash
node --version  # v14.0.0 o superior
npm --version   # 6.0.0 o superior
git --version   # 2.0 o superior
```

---

## 💻 Configuración Local

### 1. Clonar Repositorio
```bash
git clone https://github.com/YOUR_USERNAME/restaurante-pos.git
cd restaurante-pos
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tu editor favorito
# En Windows: notepad .env
# En Mac/Linux: nano .env
```

### 4. Configuración de .env para Desarrollo Local (SQLite)
```env
NODE_ENV=development
PORT=3000
USE_LOCAL_DB=true
DB_PATH=./restaurante.db
USERS_DB_PATH=./usuarios.db
SESSION_SECRET=your-development-secret-key-change-this
NO_OPEN=false
```

### 5. Crear Base de Datos de Usuarios Inicial
```bash
node crear_usuarios_db.js
```

Este comando crea el archivo `usuarios.db` con un usuario administrador:
- **Usuario:** admin
- **Contraseña:** admin
- **Rol:** admin

⚠️ **IMPORTANTE:** Cambia esta contraseña después de tu primer login.

### 6. Ejecutar Localmente
```bash
npm run dev
```

La app se abrirá automáticamente en `http://localhost:3000`

---

## 🚀 Deployment a Render.com

### Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com/new)
2. Crea un nuevo repositorio llamado `restaurante-pos`
3. **NO** initializes con README (usaremos el local)

### Paso 2: Subir Código a GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/restaurante-pos.git
git branch -M main
git add .
git commit -m "Initial commit: Restaurante POS Sistema"
git push -u origin main
```

### Paso 3: Conectar a Render.com

1. Ve a [Render.com](https://render.com/)
2. Haz login con tu cuenta
3. Click en "New +" → "Web Service"
4. Elige "Deploy existing repository"
5. Conecta tu GitHub (autoriza si es necesario)
6. Selecciona el repositorio `restaurante-pos`

### Paso 4: Configurar Render

| Campo | Valor |
|-------|-------|
| **Name** | restaurante-pos |
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (para desarrollo) |

### Paso 5: Agregar Variables de Entorno

En Render, ve a "Environment" y añade:

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-super-secret-production-key-MUST-CHANGE
SUPABASE_ENABLED=true
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
CORS_ORIGIN=https://your-render-domain.onrender.com
NO_OPEN=true
```

### Paso 6: Desplegar

Click en "Create Web Service" - Render comenzará a desplegar tu app.

⏳ **El despliegue toma 3-5 minutos**

Una vez completado, recibirás una URL: `https://restaurante-pos-xxxx.onrender.com/`

---

## 🗄️ Configuración de Supabase

### Paso 1: Crear Proyecto en Supabase

1. Ve a [Supabase](https://supabase.com/)
2. Click en "New project"
3. **Database Password:** Usa una contraseña fuerte y CÓPIALA
4. Region: Elige la más cercana a ti
5. Click "Create new project"

⏳ Esperaespera 2-3 minutos mientras se crea

### Paso 2: Obtener Connection String

1. En Supabase, ve a "Settings" → "Database"
2. Bajo "Connection Pooling", copia el connection string de `postgres://...`
3. Reemplaza `[YOUR-PASSWORD]` con la contraseña que configuraste

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### Paso 3: Crear Tablas en Supabase

En Supabase, ve a "SQL Editor" → "New Query" y ejecuta:

```sql
-- Crear tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'caja', 'cocina')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de menú
CREATE TABLE menu (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    categoria TEXT NOT NULL,
    impuesto_incluido INTEGER DEFAULT 1 NOT NULL,
    imagen TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de órdenes
CREATE TABLE ordenes (
    id SERIAL PRIMARY KEY,
    subtotal DECIMAL(10,2) NOT NULL,
    isv DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    estado TEXT NOT NULL,
    cliente_nombre TEXT,
    cliente_rtn TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de items de orden
CREATE TABLE orden_items (
    id SERIAL PRIMARY KEY,
    orden_id INTEGER NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    cantidad INTEGER NOT NULL
);

-- Crear tabla de inventario
CREATE TABLE inventario (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    cantidad REAL DEFAULT 0,
    unidad TEXT DEFAULT 'unidades',
    minimo REAL DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    rtn TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejor performance
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_fecha ON ordenes(fecha);
CREATE INDEX idx_orden_items_orden_id ON orden_items(orden_id);
CREATE INDEX idx_menu_nombre ON menu(nombre);
CREATE INDEX idx_usuarios_username ON usuarios(username);
```

### Paso 4: Insertar Admin Inicial

```sql
INSERT INTO usuarios (username, password, role) 
VALUES ('admin', 'changeme123', 'admin');
```

⚠️ **IMPORTANTE:** Cambia `changeme123` ejecutando el script de setup después.

### Paso 5: Actualizar Variables en Render

1. Ve a tu servicio en Render
2. "Environment" → Edita `DATABASE_URL`
3. Pega el connection string de Supabase
4. Guarda cambios

*Render automáticamente redesplegará con las nuevas variables*

---

## 🔐 Seguridad para Producción

### Checklist Crítico

- [ ] **SESSION_SECRET:** Genera una contraseña fuerte (min 32 caracteres)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **CORS_ORIGIN:** Cambia de `*` a tu dominio real
  ```env
  CORS_ORIGIN=https://tu-dominio.com
  ```

- [ ] **Cambiar Contraseña Admin:** 
  1. Login en la app
  2. Usa la sección de Admin para cambiar contraseña
  3. O en Supabase SQL Editor:
     ```sql
     UPDATE usuarios SET password = 'nueva-hash' WHERE username = 'admin';
     ```

- [ ] **Monitorear Logs:** 
  - Render: Ve a "Logs" en tu servicio
  - Busca errores o accesos sospechosos

---

## 🛠️ Solución de Problemas

### Error: "ERRATA: SESSION_SECRET no está configurado"
**Solución:** Añade `SESSION_SECRET` a tus variables de entorno en Render

```env
SESSION_SECRET=your-super-secret-key-with-32-chars-min
```

---

### Error: "database connection failed"
**Solución:** Verifica el `DATABASE_URL`
1. Copia el connection string nuevamente de Supabase
2. Asegúrate de reemplazar `[YOUR-PASSWORD]`
3. Verifica que no haya espacios al pegar

---

### App se reinicia infinitamente
**Solución:** Revisa los logs en Render
- Click en "Logs" en tu servicio
- Busca mensajes de error
- Asegúrate que `NODE_ENV=production`

---

### No puedo hacer login
**Solución:**
1. Verifica que la tabla `usuarios` existe en Supabase
2. Comprueba el usuario admin está creado:
   ```sql
   SELECT * FROM usuarios WHERE username='admin';
   ```
3. Si no existe, créalo nuevamente

---

## 📱 Usar la App en Móvil

1. Ve a: `https://restaurante-pos-xxxx.onrender.com/`
2. Usa las credenciales admin que configuraste
3. Bookmark para acceso rápido

**Nota:** Requiere conexión a Internet. Para desarrollo offline, usa SQLite localmente.

---

## 📧 Soporte

Para problemas:

1. Revisa los logs en Render y Supabase
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate que las tablas existe en Supabase
4. Consulta la documentación oficial:
   - [Render Docs](https://render.com/docs)
   - [Supabase Docs](https://supabase.com/docs)

---

## 🎯 Próximos Pasos (Recomendado)

- [ ] Configurar dominio personalizado en Render
- [ ] Habilitar HTTPS automático
- [ ] Configurar backups automáticos en Supabase
- [ ] Monitorear logs y errores
- [ ] Implementar 2FA para admin
- [ ] Agregar certificados SSL personalizados

---

**Última actualización:** 2024  
**Versión:** 1.0.0
