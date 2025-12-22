const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'restaurante.db');
const plantillaPath = path.join(__dirname, 'base_inicial.db');

console.log('--- Verificando sistema de base de datos ---');

// 1. Lógica de instalación: Si no existe restaurante.db, copiamos la plantilla (base_inicial.db)
if (!fs.existsSync(dbPath)) {
    if (fs.existsSync(plantillaPath)) {
        console.log('Instalación nueva detectada: Copiando base_inicial.db a restaurante.db');
        fs.copyFileSync(plantillaPath, dbPath);
    } else {
        console.log('No se encontró base_inicial.db. Se creará una base de datos vacía.');
    }
} else {
    console.log('Base de datos existente. Se conservarán los datos (órdenes, historial).');
}

// 2. Conectar para aplicar migraciones
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Intentar agregar la columna 'imagen' a la tabla 'menu'
    db.run("ALTER TABLE menu ADD COLUMN imagen TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('AVISO: La columna "imagen" ya existía. No se hicieron cambios.');
            } else {
                console.error('ERROR al actualizar la base de datos:', err.message);
            }
        } else {
            console.log('ÉXITO: Columna "imagen" agregada correctamente.');
        }
    });
});

db.close();