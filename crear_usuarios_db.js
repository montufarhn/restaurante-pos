const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'usuarios.db');
const saltRounds = 10;
const defaultAdminPass = 'admin'; // Contraseña por defecto para el primer admin

// --- Configuración de Idioma para Consola ---
const lang = process.env.LANG_SHORT || 'en';
const MESSAGES = {
    es: { exists: 'Base de datos de usuarios ya existe. No se realizarán cambios.', created: 'Base de datos de usuarios creada.', table_created: 'Tabla "usuarios" creada.', pass_error: 'Error al hashear la contraseña por defecto:', user_error: 'Error al insertar el usuario admin por defecto:', success: `Usuario 'admin' por defecto creado con éxito. Contraseña:` },
    en: { exists: 'User database already exists. No changes will be made.', created: 'User database created.', table_created: '"usuarios" table created.', pass_error: 'Error hashing default password:', user_error: 'Error inserting default admin user:', success: `Default 'admin' user created successfully. Password:` },
    // Puedes agregar más idiomas si lo deseas
};
const t = MESSAGES[lang] || MESSAGES['en'];

// No ejecutar si la DB ya existe
if (fs.existsSync(dbPath)) {
    console.log(t.exists);
    return;
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(t.created, err.message);
    console.log(t.created);
});

db.serialize(() => {
    db.run(`CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'caja', 'cocina'))
    )`, (err) => {
        if (err) return console.error(t.table_created, err.message);
        console.log(t.table_created);

        bcrypt.hash(defaultAdminPass, saltRounds, (err, hash) => {
            if (err) return console.error(t.pass_error, err);
            db.run(`INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)`, ['admin', hash, 'admin'], (err) => {
                if (err) return console.error(t.user_error, err.message);
                console.log(`${t.success} ${defaultAdminPass}`);
                db.close();
            });
        });
    });
});