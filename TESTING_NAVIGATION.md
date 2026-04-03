# 🚀 Guía de Prueba - Sistema de Navegación Actualizado para Android

## ✅ Cambios Realizados (Resumen)

### 1. **Sistema de Navegación Centralizado** (`app.js`)
- Maneja el stack de navegación entre pantallas
- Controla el botón atrás de Android automáticamente
- Gestiona sesiones y logout correctamente

### 2. **Controlador de Aplicación** (`app.js`)
- Detecta automáticamente si hay sesión activa
- Redirige a login si no hay sesión
- Maneja transiciones entre vistas

### 3. **Actualización de Páginas HTML**
- Todas las páginas ahora importan `app.js`
- Logout funciona correctamente: `App.logout()` en lugar de `window.location.href`
- Mismo comportamiento en web y Capacitor

### 4. **Soporte para Botón Atrás de Android**
- `@capacitor/app` detecta presión del botón atrás
- Navega correctamente entre pantallas
- Si está en login sin historial, cierra la app

---

## 🔧 Pasos para Probar en tu Android

### **Paso 1: Sincronizar con Capacitor**
```bash
cd d:\Documents\Github\restaurante-pos
npx cap sync
```

### **Paso 2: Abrir en Android Studio**
```bash
npx cap open android
```

### **Paso 3: Ejecutar en Emulador**
1. En Android Studio: **Run** → selecciona tu emulador/dispositivo
2. Espera a que compile e instale

---

## 🧪 Pruebas Recomendadas

### **Test 1: Login**
- [ ] Inicia la app
- [ ] Ingresa usuario: `admin` / contraseña: `admin`
- [ ] Verifica que aparezca la pantalla de Dashboard

### **Test 2: Navegación entre Pantallas**
- [ ] En Dashboard, toca **"Punto de Venta"** (o cualquier botón)
- [ ] Verifica que se cargue la pantalla correspondiente
- [ ] Toca el **botón atrás** de Android (inferior o hardware)
- [ ] Verifica que **vuelva al Dashboard**, no que minimice la app

### **Test 3: Navegación Profunda**
- [ ] Desde Dashboard → Caja
- [ ] Desde Caja → (si hay opciones) vuelve con atrás
- [ ] Verifica que vuelva a Dashboard, no a login

### **Test 4: Persistencia de Datos**
- [ ] En Caja, crea una orden de prueba
- [ ] Presiona "Atrás" varias veces
- [ ] Cierra completamente la app (swiping desde recientes)
- [ ] Reabre la app
- [ ] Verifica que la orden siga ahí

### **Test 5: Logout**
- [ ] Desde cualquier pantalla, toca **"Cerrar Sesión"**
- [ ] Verifica que vuelva a Login
- [ ] Intenta presionar atrás en login
- [ ] Verifica que la app se cierre (o pase a home)

### **Test 6: Administración**
- [ ] En Dashboard, accede a **"Administración"**
- [ ] Modifica nombre/moneda/idioma
- [ ] Guarda cambios
- [ ] Presiona "Atrás"
- [ ] Reabre la app
- [ ] Verifica que los cambios se mantuvieron

---

## 🐛 Si Algo No Funciona

### **Problema: El botón atrás todavía minimiza**
**Solución:**
- Verifica que `app.js` esté cargado: abre Inspector (F12) → Console
- Si no hay errores, el plugin Capacitor puede no estar instalado
- Ejecuta: `npm install @capacitor/app`
- Luego: `npx cap sync`

### **Problema: Logout no funciona**
**Solución:**
- Verifica que los botones logout tengan `id="btn-logout"`
- Verifica que se haya agregado el event listener en el script
- En Console, ejecuta: `await App.logout()` para probar manualmente

### **Problema: No ve cambios después de sync**
**Solución:**
- Limpia el caché: `npx cap clean`
- Vuelve a sincronizar: `npx cap sync`
- Fuerza rebuild en Android Studio: **Build** → **Clean Project**

### **Problema: Los datos no se guardan**
**Solución:**
- Verifica que estés usando `API.saveConfig()` no `fetch()`
- En Capacitor/nativo, los datos se guardan en SQLite
- En web, en localStorage
- Ambos son persistentes

---

## 📱 Acceso Rápido a Logs (Depuración)

En Android Studio:
1. **View** → **Tool Windows** → **Logcat**
2. Filtra por: `restaurante`
3. Verás todos los `console.log()` de tu app

```javascript
// En cualquier página, puedes agregar:
console.log('Debug:', App.currentView);
console.log('Stack:', App.navigationStack);
```

---

## 🎯 Checklist Final

- [ ] App instala sin errores
- [ ] Login funciona
- [ ] Botón atrás no minimiza
- [ ] Navegación entre pantallas funciona
- [ ] Logout vuelve a login
- [ ] Datos persisten después de cerrar
- [ ] Cambios en admin se guardan
- [ ] En `console.log` no hay errores críticos

---

## 💡 Notas Importantes

1. **En modo Capacitor (android)**: usa `LocalDB` (SQLite nativo)
2. **En web**: usa `localStorage` como fallback
3. **El botón atrás**: manejado por `@capacitor/app`
4. **Sesión**: guardada en `localStorage` (compatible con ambos modos)
5. **Logout**: limpia sesión y vuelve a login

---

## 🚀 Siguiente Paso (Después de Validar)

Una vez que todo funcione:
```bash
# Generar APK de release
# En Android Studio: Build → Generate Signed Bundle/APK
# Selecciona APK → siguiente
# Elige tu keystore (o crea uno nuevo)
# Firma y obtén el .apk
```

¡Éxito! 🎉
