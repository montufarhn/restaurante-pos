# 🍽️ Restaurante POS - Sistema de Punto de Venta

Una solución completa, segura y de fácil uso para restaurantes pequeños y medianos. Gestiona ventas, inventario, pedidos de cocina y reportes desde una única plataforma.

## ✨ Características Principales

### 💳 Punto de Venta (POS)
- Interfaz intuitiva y rápida para registrar órdenes
- Soporte para múltiples monedas y tasas de impuesto
- Cálculo automático de cambio
- Gestión de clientes (búsqueda, creación, actualización)

### 👨‍🍳 Panel de Cocina (KDS)
- Vista en tiempo real de órdenes pendientes
- Marcar órdenes como completadas
- Notificaciones en tiempo real via WebSocket

### 📊 Reportes y Análisis
- Historial completo de ventas
- Reportes por rango de fechas
- Top 10 platillos más vendidos

### ⚙️ Panel Administrativo
- Gestión completa del menú
- Control de inventario
- Gestión de usuarios y roles
- Configuración del restaurante

### 🔐 Seguridad
- Autenticación basada en sesiones
- Control de roles (Admin, Caja, Cocina)
- Contraseñas hasheadas con bcrypt
- CORS y headers de seguridad

## 🚀 Inicio Rápido

### Requisitos
- Node.js >= 14
- npm >= 6
- Git

### Instalación

```bash
# Clonar proyecto
git clone https://github.com/tu-usuario/restaurante-pos.git
cd restaurante-pos

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Crear base de usuarios inicial
node crear_usuarios_db.js

# Iniciar desarrollo
npm run dev
```

Abre `http://localhost:3000` - Las credenciales se proporcionan al ejecutar el script.

---

## 🌐 Deployment en Producción

Consulta [DEPLOYMENT.md](./DEPLOYMENT.md) para una guía completa de despliegue en:
- **Render.com** (hosting)
- **Supabase** (base de datos PostgreSQL)

---

## 🏗️ Estructura del Proyecto

```
restaurante-pos/
├── server.js              # Backend Express
├── package.json           # Dependencias
├── .env.example           # Variables de entorno
├── Dockerfile             # Imagen Docker
├── public/                # Frontend
│   ├── index.html         # Login
│   ├── caja.html          # POS
│   ├── cocina.html        # Kitchen Display
│   ├── admin.html         # Administración
│   └── reportes.html      # Reportes
├── DEPLOYMENT.md          # Guía de deployment
└── README.md              # Este archivo
```

---

## 👥 Roles y Permisos

| Función | Admin | Caja | Cocina |
|---------|-------|------|--------|
| POS | ✅ | ✅ | ❌ |
| Editar menú | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver cocina/marcar listo | ✅ | ✅ | ✅ |

---

## 🔧 Tecnologías

- **Backend:** Node.js, Express, SQLite/PostgreSQL, Socket.io
- **Frontend:** HTML5, CSS3, JavaScript
- **Seguridad:** Bcrypt, Helmet, CORS, Validación
- **DevOps:** Docker, GitHub, Render, Supabase

---

## 📝 Licencia

ISC

---

## 🤝 Soporte

Para problemas o preguntas:
1. Revisa [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Consulta los logs
3. Verifica las variables de entorno

---

**Versión:** 1.0.0
