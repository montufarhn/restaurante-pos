# 🔐 Guía de Seguridad - Restaurante POS

Este documento describe las medidas de seguridad implementadas y las mejores prácticas.

## 🛡️ Medidas de Seguridad Implementadas

### 1. Autenticación y Autorización

#### ✅ Implementado
- **Bcrypt Hashing:** Todas las contraseñas se hashean con bcrypt (10 rounds)
- **Sesiones Seguras:** Cookies HTTPOnly, Secure, SameSite=strict
- **Control de Roles:** Admin, Caja, Cocina con permisos diferenciados
- **Timeout de Sesión:** 8 horas de inactividad (configurable)

#### 🔧 Uso
```javascript
// Login automáticamente hashea contraseña
bcrypt.compare(inputPassword, hashedPassword, callback);

// Middleware de autenticación
app.get('/api/menu', checkAuth, (req, res) => {
    // Solo usuarios autenticados
});

// Control de rol
app.delete('/api/menu/:id', checkRole(['admin']), (req, res) => {
    // Solo administradores
});
```

---

### 2. Datos en Tránsito

#### ✅ Implementado
- **HTTPS en Producción:** Render.com + Supabase usan SSL/TLS
- **CORS Configurado:** Previene requests de orígenes no autorizados
- **Helmet.js:** Headers de seguridad automáticos
- **CSRF Tokens:** Cookies SameSite=strict

#### 🔧 Configuración
```env
# .env
NODE_ENV=production           # Activa HTTPS
CORS_ORIGIN=https://tu-dominio.com  # Solo tu dominio
```

---

### 3. Validación de Entrada

#### ✅ Implementado
- **Prepared Statements:** Todas las queries usan placeholders `?`
- **Validación de Tipo:** Verificación de tipos de entrada
- **Límites de Longitud:** Prevención de buffer overflow
- **Sanitización:** Escape automático en bases de datos

#### ❌ NO Implementado
- **MD5/SHA-1:** Usar bcrypt en su lugar
- **Concatenación SQL:** Siempre usar `?` placeholders

#### 🔧 Ejemplo Correcto
```javascript
// ✅ CORRECTO - Prepared statement
db.run("SELECT * FROM usuarios WHERE username = ?", [username], callback);

// ❌ INCORRECTO - SQL Injection
db.run(`SELECT * FROM usuarios WHERE username = '${username}'`, callback);
```

---

### 4. Gestión de Secretos

#### ✅ Implementado
- **Variables de Entorno:** Secretos en `.env` (NO en código)
- **Validación de Startup:** Error si SESSION_SECRET es default
- **Rotación:** Cambiar SESSION_SECRET en producción

#### 🔧 Setup
```bash
# Generar SECRET seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Guardar en .env
SESSION_SECRET=tu-key-generada
```

---

### 5. Contraseña del Admin

#### ⚠️ CRÍTICO

**Nunca dejar contraseña de admin como `admin` en producción.**

#### Cambiar Contraseña

**Opción 1: Via App**
1. Login como admin
2. Ir a "Administración" → "Usuarios"
3. Editar usuario "admin"
4. Cambiar contraseña

**Opción 2: Via SQL (Supabase)**
```sql
-- Primero genera hash en local:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('nueva-contraseña', 10, (err, hash) => console.log(hash))"

UPDATE usuarios 
SET password = '$2b$10$...[el-hash-generado]...' 
WHERE username = 'admin';
```

---

### 6. Errores y Logging

#### ✅ Implementado
- **Error Handling:** Middleware centralizado de errores
- **Logs Seguros:** No revelar detalles en producción
- **Mensajes Genéricos:** "Usuario o contraseña incorrectos" (igual para ambos casos)

#### 🔧 Errores en Producción vs Desarrollo
```javascript
NODE_ENV=production  // Mensajes genéricos
NODE_ENV=development // Detalles de error completos
```

---

## 🚨 Vulnerabilidades Resueltas

### SQL Injection
**Estado:** ✅ Resuelto
- Todas las queries usan placeholders `?`
- No hay concatenación de strings

### XSS (Cross-Site Scripting)
**Estado:** ⚠️ Parcialmente
- Frontend: Usar `textContent` en lugar de `innerHTML`
- Sanitizar imágenes subidas

### CSRF (Cross-Site Request Forgery)
**Estado:** ✅ Resuelto
- Cookies SameSite=strict
- CORS configurado
- Sessions server-side

### Contraseñas en Plain Text
**Estado:** ✅ Resuelto
- Bcrypt hashing implementado
- NO guardar passwords en localStorage

### Información Sensible en Logs
**Estado:** ✅ Resuelto
- Logs no incluyen passwords
- Logs no revelan estructura de DB en producción

---

## 📋 Checklist de Seguridad Previo a Producción

### Configuración
- [ ] SESSION_SECRET cambió del valor por defecto
- [ ] NODE_ENV=production
- [ ] Contraseña admin cambió de "admin"
- [ ] CORS_ORIGIN es tu dominio (no `*`)
- [ ] DATABASE_URL es válido y seguro

### Base de Datos
- [ ] Backups automáticos habilitados (Supabase)
- [ ] Credenciales seguras en Supabase
- [ ] Permisos de BD correctamente configurados

### Monitoreo
- [ ] Logs monitoreados en Render
- [ ] Alertas configuradas para errores
- [ ] Backups probados (restore test)

### Historia de Git
- [ ] `.env` no está en el repositorio
- [ ] `.gitignore` está actualizado
- [ ] No hay secretos en commits anteriores

---

## 🔒 Mejores Prácticas

### 1. Contraseñas Fuertes
```
✅ Correcto:   P@ssw0rd!M0Re$ecure#2024
❌ Incorrecto: admin, 123456, password
```

Mínimo recomendado:
- 12 caracteres
- Mayúsculas, minúsculas, números, símbolos
- Sin palabras diccionario

### 2. Cambio de Contraseña Regular
- Cada 90 días (admin)
- Inmediatamente si sospechas compromiso
- Si empleado se va

### 3. Backups
```sql
-- En Supabase: automático diariamente
-- Testear restore cada mes
-- Guardar en ubicación segura
```

### 4. Auditoría
- Revisar logs semanalmente
- Buscar: failed logins, cambios sospechosos
- Monitorear performance (posibles ataques DoS)

### 5. Actualizaciones
```bash
# Revisar vulnerabilidades
npm audit

# Actualizar dependencias (mensualmente)
npm update

# Actualizar críticas inmediatamente
npm install package@latest
```

---

## 🚨 Incidentes de Seguridad

Si sospecha de un incidente:

1. **Cambiar Contraseña Admin Inmediatamente**
   ```bash
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('NEW_PASS', 10, (_, h) => console.log(h))"
   ```

2. **Revisar Logs Recientes**
   - Render: Logs sección
   - Buscar: login attempts fallidos, cambios raros

3. **Resetear Sesiones**
   - Logout todos los usuarios
   - Reiniciar servidor

4. **Auditar Órdenes**
   - Buscar transacciones sospechosas
   - Verificar integridad de datos

5. **Contactar Soporte**
   - Supabase: security@supabase.io
   - Render: support@render.com

---

## 📧 Reportar Vulnerabilidades

Si encuentras una vulnerabilidad:

1. **NO** publiques en público
2. Contacta: security@tu-dominio.com
3. Describe el problema en detalle
4. Proporciona pasos para reproducir

Nos comprometemos a responder en 48 horas.

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/Top10/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
- [Helmet.js Docs](https://helmetjs.github.io/)

---

**Última actualización:** 2024  
**Versión:** 1.0.0
