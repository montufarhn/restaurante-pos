const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./restaurante.db');

console.log("--- Verificando actualizaciones de base de datos ---");

db.serialize(() => {
    // 1. Crear tablas si no existen (NO SOBREESCRIBE DATOS)
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria TEXT NOT NULL,
        impuesto_incluido INTEGER DEFAULT 1 NOT NULL,
        imagen TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ordenes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subtotal REAL NOT NULL,
        isv REAL NOT NULL,
        total REAL NOT NULL,
        fecha TEXT NOT NULL,
        estado TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orden_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orden_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        cantidad INTEGER NOT NULL,
        FOREIGN KEY (orden_id) REFERENCES ordenes(id)
    )`);

    // Tabla nueva de Inventario
    db.run(`CREATE TABLE IF NOT EXISTS inventario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        cantidad REAL DEFAULT 0,
        unidad TEXT DEFAULT 'unidades',
        minimo REAL DEFAULT 5
    )`);

    // 2. Verificar columnas faltantes en MENU (Migraciones)
    db.all("PRAGMA table_info(menu)", (err, columns) => {
        if (err) {
            console.error("Error al leer info de menu:", err);
            return;
        }
        const colNames = columns.map(c => c.name);

        if (!colNames.includes('impuesto_incluido')) {
            console.log("Actualizando: Agregando columna 'impuesto_incluido'...");
            db.run("ALTER TABLE menu ADD COLUMN impuesto_incluido INTEGER DEFAULT 1 NOT NULL");
        }

        if (!colNames.includes('imagen')) {
            console.log("Actualizando: Agregando columna 'imagen'...");
            db.run("ALTER TABLE menu ADD COLUMN imagen TEXT");
        }
    });
});

db.close((err) => {
    if (err) console.error(err.message);
    console.log("--- Base de datos verificada ---");
});