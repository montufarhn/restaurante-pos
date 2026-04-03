# ⚠️ PROBLEMAS CRÍTICOS Y ACCIONES NECESARIAS

Este documento lista los problemas encontrados y las acciones tomadas para resolverlos.

## ✅ RESUELTOS

### 1. Session Secret Hardcodeado
**Problema:** Secret de sesión en código fuente
**Solución:** ✅ Movido a variable de entorno `SESSION_SECRET`
**Archivo:** `.env`, `server.js`

### 2. Credenciales por Defecto Inseguras
**Problema:** Usuario admin/admin hardcodeado
**Solución:** ✅ Script `crear_usuarios_db.js` genera hash con bcrypt
**Acción:** Ejecutar `node crear_usuarios_db.js` después de instalar

### 3. Sin CORS/Security Headers
**Problema:** Vulnerable a CSRF y ataques entre orígenes
**Solución:** ✅ Agregado helmet.js y CORS configurado
**Archivo:** `server.js` (helmet middleware)

### 4. Socket.io sin Autenticación
**Problema:** Cualquiera puede conectar y emitir eventos
**Solución:** ✅ Agregada validación de sesión en Socket.io
**Archivo:** `server.js` (io.on('connection'))

### 5. Validación Insuficiente en Endpoints
**Problema:** Inputs no validados pueden causar errores
**Solución:** ✅ Agregada validación en POST /api/users y POST /api/menu
**Archivos:** `server.js`

### 6. Cookies Sin Bandera HTTPOnly
**Problema:** XSS puede robar sesión
**Solución:** ✅  Agregado `httpOnly: true`, `secure: true`, `sameSite: 'strict'`
**Archivo:** `server.js` (session config)

### 7. Port Hardcodeado
**Problema:** No flexible para diferentes entornos
**Solución:** ✅ PORT desde `process.env.PORT`
**Archivo:** `.env`, `server.js`

### 8. Sin .gitignore Apropiado
**Problema:** Datos sensibles pueden subirse a GitHub
**Solución:** ✅ Creado `.gitignore` completo
**Archivo:** `.gitignore`

### 9. Sin Documentación de Deployment
**Problema:** Imposible desplegar correctamente
**Solución:** ✅ Creado `DEPLOYMENT.md` con guía paso a paso
**Archivo:** `DEPLOYMENT.md`

#### 10. Sin Docker Support
**Problema:** Difícil desplegar en Render
**Solución:** ✅ Creado `Dockerfile` y `.dockerignore`
**Archivos:** `Dockerfile`, `.dockerignore`

---

## ⚠️ PARCIALMENTE RESUELTOS (Requieren Acción Manual)

### 1. Plaintext Passwords en Browser (sqlite-service.js)
**Estado:** ⚠️ Crítico en móvil
**Problema:** LocalDB almacena passwords sin hash en localStorage
**Riesgo:** Si móvil es robado o compromised, passwords visibles

**Acción Recomendada:**
1. Para producción, usar Supabase (resuelto automáticamente)
2. Para desarrollo offline, considerar encrypted storage
3. No desplegar app Android a producción sin corrección

**Roadmap:**
- [ ] Implementar encryption en localStorage
- [ ] Usar Device Storage API nativa
- [ ] Migrar completamente a Supabase

---

## 🔧 CONFIGURACIÓN MANUAL REQUERIDA

### Antes de Production:

1. **Cambiar SESSION_SECRET**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Copiar output a .env
   ```

2. **Cambiar Contraseña Admin**
   - Login en app
   - Administración → Usuarios → Editar admin
   - Cambiar contraseña

3. **Configurar CORS_ORIGIN**
   ```env
   # Cambiar de:
   CORS_ORIGIN=*
   # A:
   CORS_ORIGIN=https://tu-dominio.onrender.com
   ```

4. **Configurar Base de Datos**
   ```env
   SUPABASE_ENABLED=true
   DATABASE_URL=postgresql://...
   ```

---

## 🚀 DEPLOYMENT CHECKLIST

Antes de subir a producción:

```
Seguridad:
- [ ] SESSION_SECRET es único (no default)
- [ ] NODE_ENV=production
- [ ] Contraseña admin cambiada
- [ ] CORS_ORIGIN = dominio real (no *)
- [ ] DATABASE_URL configurado

Configuración:
- [ ] .env no está en GitHub
- [ ] .gitignore está actualizado
- [ ] Dockerfile testado localmente
- [ ] Variables de entorno en Render

Base de Datos:
- [ ] Supabase proyecto creado
- [ ] Tablas migradas
- [ ] Admin user creado
- [ ] Backups configurados

Monitoreo:
- [ ] Logs en Render configurados
- [ ] Alertas de error habilitadas
- [ ] Monitoring de performance

Documentación:
- [ ] Team sabe contraseña admin
- [ ] Backup plan documentado
- [ ] Recovery procedure conocido
```

---

## 🔍 AUDITORIA DE SEGURIDAD

Problemas encontrados durante revisión:

| # | Problema | Severidad | Estado | Archivo |
|---|----------|-----------|--------|---------|
| 1 | SESSION_SECRET hardcodeado | 🔴 Crítico | ✅ Resuelto | server.js |
| 2 | Credenciales default | 🔴 Crítico | ✅ Resuelto | crear_usuarios_db.js |
| 3 | Sin CORS/Headers | 🟠 Alto | ✅ Resuelto | server.js |
| 4 | Socket sin auth | 🟠 Alto | ✅ Resuelto | server.js |
| 5 | Validación insuficiente | 🟡 Medio | ✅ Resuelto | server.js |
| 6 | Cookies sin flags | 🟡 Medio | ✅ Resuelto | server.js |
| 7 | Plaintext en localStorage | 🔴 Crítico | ⚠️ Parcial | sqlite-service.js |
| 8 | SQL Injection potencial | 🔴 Crítico | ✅ Resuelto | server.js |
| 9 | Error messages revelan info | 🟡 Medio | ✅ Resuelto | server.js |

---

## 📞 Próximos Pasos

1. **Inmediato:**
   - [ ] Configurar `.env` apropiadamente
   - [ ] Ejecutar `node crear_usuarios_db.js`
   - [ ] Cambiar contraseña admin
   - [ ] Testear localmente

2. **Antes de Deploy:**
   - [ ] Generar SESSION_SECRET único
   - [ ] Testear en Docker localmente
   - [ ] Configurar Supabase
   - [ ] Revisar SECURITY.md

3. **Post-Deploy:**
   - [ ] Monitorear logs
   - [ ] Testear todos los endpoints
   - [ ] Verificar backups
   - [ ] Documentar procesos

---

## 📚 Documentos Relacionados

- [SECURITY.md](./SECURITY.md) - Detalles de seguridad
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía de despliegue
- [README.md](./README.md) - Información general

---

**Última actualización:** 2024  
**Auditoría completada:** Sí
**Apto para producción:** Sí (después de configurar manualmente)
