// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const open = require('open');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const saltRounds = 10;

// --- Configuración de Idioma para Consola ---
const lang = process.env.LANG_SHORT || 'en';
const SERVER_MESSAGES = {
    es: {
        db_connected: "Conectado a la base de datos SQLite.",
        db_error: "Error al abrir la base de datos",
        server_running: "Servidor corriendo en",
        main_screen: "- Pantalla Principal:",
        pos_screen: "- Caja/POS:",
        admin_screen: "- Administración:",
        reports_screen: "- Reportes:",
        kitchen_screen: "- Cocina/KDS:",
        user_connected: "Un usuario se ha conectado",
        user_disconnected: "Un usuario se ha desconectado"
    },
    en: {
        db_connected: "Connected to SQLite database.",
        db_error: "Error opening database",
        server_running: "Server running at",
        main_screen: "- Main Screen:",
        pos_screen: "- POS/Register:",
        admin_screen: "- Administration:",
        reports_screen: "- Reports:",
        kitchen_screen: "- Kitchen/KDS:",
        user_connected: "A user connected",
        user_disconnected: "A user disconnected"
    },
    fr: {
        db_connected: "Connecté à la base de données SQLite.",
        db_error: "Erreur lors de l'ouverture de la base de données",
        server_running: "Serveur fonctionnant sur",
        main_screen: "- Écran Principal :",
        pos_screen: "- Caisse/POS :",
        admin_screen: "- Administration :",
        reports_screen: "- Rapports :",
        kitchen_screen: "- Cuisine/KDS :",
        user_connected: "Un utilisateur s'est connecté",
        user_disconnected: "Un utilisateur s'est déconnecté"
    },
    pt: {
        db_connected: "Conectado ao banco de dados SQLite.",
        db_error: "Erro ao abrir o banco de dados",
        server_running: "Servidor rodando em",
        main_screen: "- Tela Principal:",
        pos_screen: "- Caixa/POS:",
        admin_screen: "- Administração:",
        reports_screen: "- Relatórios:",
        kitchen_screen: "- Cozinha/KDS:",
        user_connected: "Um usuário conectou-se",
        user_disconnected: "Um usuário desconectou-se"
    },
    ja: {
        db_connected: "SQLiteデータベースに接続しました。",
        db_error: "データベースを開く際にエラーが発生しました",
        server_running: "サーバー稼働中:",
        main_screen: "- メイン画面:",
        pos_screen: "- レジ/POS:",
        admin_screen: "- 管理:",
        reports_screen: "- レポート:",
        kitchen_screen: "- キッチン/KDS:",
        user_connected: "ユーザーが接続しました",
        user_disconnected: "ユーザーが切断しました"
    },
    zh: {
        db_connected: "已连接到 SQLite 数据库。",
        db_error: "打开数据库时出错",
        server_running: "服务器运行于",
        main_screen: "- 主屏幕：",
        pos_screen: "- 收银台/POS：",
        admin_screen: "- 管理：",
        reports_screen: "- 报表：",
        kitchen_screen: "- 厨房/KDS：",
        user_connected: "用户已连接",
        user_disconnected: "用户已断开连接"
    }
};
const t = SERVER_MESSAGES[lang] || SERVER_MESSAGES['en'];

// Asegurar que existe la carpeta de uploads
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento para Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        // Guardar con fecha para evitar nombres duplicados
        cb(null, Date.now() + path.extname(file.originalname)) 
    }
});

const upload = multer({ storage: storage });

// --- Tasas de Impuestos por Moneda ---
const TAX_RATES = {
    "L.": 0.15,   // Honduras (ISV)
    "BZ$": 0.125, // Belice (GST)
    "Q": 0.12,    // Guatemala (IVA)
    "$": 0.08,    // USA/General (Sales Tax estimado)
    "€": 0.20,    // Europa (VAT promedio)
    "£": 0.20,    // UK (VAT)
    "¥": 0.10,    // Japón (Consumption Tax)
    "CN¥": 0.13   // China (VAT)
};


// --- Configuración del Restaurante (Persistente) ---
const CONFIG_PATH = path.join(__dirname, 'config.json');
let restaurantConfig = {};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            restaurantConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        } else {
            restaurantConfig = {
                nombre: "Sazon 1804",
                rtn: "",
                cai: "",
                rangoInicio: "",
                rangoFin: "",
                idioma: "es",
                moneda: "L.",
                logo: "" // path al logo
            };
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(restaurantConfig, null, 2));
        }
    } catch (error) {
        console.error("Error al cargar o crear el archivo de configuración:", error);
    }
}
loadConfig(); // Cargar la configuración al iniciar

// --- Conexión a la Base de Datos de Usuarios ---
const userDb = new sqlite3.Database('./usuarios.db', (err) => {
    if (err) {
        console.error("Error al abrir la base de datos de usuarios", err.message);
    } else {
        console.log("Conectado a la base de datos de usuarios.");
    }
});

// --- Conexión a la Base de Datos SQLite ---
const db = new sqlite3.Database('./restaurante.db', (err) => {
    if (err) {
        console.error(t.db_error, err.message);
    } else {
        console.log(t.db_connected);
        // Serializar las operaciones para asegurar el orden de ejecución
        db.serialize(() => {
            // Crear la tabla si no existe
            db.run(`CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                categoria TEXT NOT NULL,
                impuesto_incluido INTEGER DEFAULT 1 NOT NULL,
                imagen TEXT
            )`, (err) => {
                if (err) return console.error("Error al crear la tabla 'menu'", err.message);
            });

            // Verificar y añadir columnas faltantes a 'menu' (impuesto_incluido, imagen)
            db.all("PRAGMA table_info(menu)", (err, columns) => {
                if (err) return console.error("Error al leer la información de la tabla 'menu'", err.message);
                
                const colNames = columns.map(col => col.name);

                if (!colNames.includes('impuesto_incluido')) {
                    console.log("Actualizando DB: Añadiendo columna 'impuesto_incluido'...");
                    db.run("ALTER TABLE menu ADD COLUMN impuesto_incluido INTEGER DEFAULT 1 NOT NULL");
                }

                if (!colNames.includes('imagen')) {
                    console.log("Actualizando DB: Añadiendo columna 'imagen'...");
                    db.run("ALTER TABLE menu ADD COLUMN imagen TEXT");
                }
            });

            // Crear tabla de órdenes
            db.run(`CREATE TABLE IF NOT EXISTS ordenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subtotal REAL NOT NULL,
                isv REAL NOT NULL,
                total REAL NOT NULL,
                fecha TEXT NOT NULL,
                estado TEXT NOT NULL
            )`);

            // Crear tabla de items de la orden
            db.run(`CREATE TABLE IF NOT EXISTS orden_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orden_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                cantidad INTEGER NOT NULL,
                FOREIGN KEY (orden_id) REFERENCES ordenes(id)
            )`);

            // Crear tabla de inventario
            db.run(`CREATE TABLE IF NOT EXISTS inventario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                cantidad REAL DEFAULT 0,
                unidad TEXT DEFAULT 'unidades',
                minimo REAL DEFAULT 5
            )`);

            db.get("SELECT COUNT(*) as count FROM menu", (err, row) => {
                // (Código para poblar el menú si está vacío, sin cambios)
            });
        });
    }
});

// --- Configuración de Sesiones ---
app.use(cookieParser());
app.use(session({
    secret: 'un-secreto-muy-secreto-para-las-sesiones', // Cambia esto por una cadena aleatoria
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas
}));

// --- Configuración del Servidor ---
app.use(express.json()); // Permitir que el servidor entienda JSON

// --- Middleware de Autenticación ---
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        return res.redirect('/');
    }
    next();
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.session.user.role)) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ error: 'Acceso denegado' });
            }
            return res.status(403).send('<h1>403 - Acceso Denegado</h1><p>No tienes permiso para ver esta página.</p><a href="/dashboard.html">Volver al Dashboard</a>');
        }
        next();
    };
};

// --- API Endpoints ---

// Endpoint de Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    userDb.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.user = { id: user.id, username: user.username, role: user.role };
                res.status(200).json({ message: 'Login exitoso' });
            } else {
                res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
            }
        });
    });
});

// Endpoint de Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.status(200).json({ message: 'Logout exitoso' });
});

// Endpoint para obtener datos de la sesión actual
app.get('/api/session', checkAuth, (req, res) => {
    res.json(req.session.user);
});

// Endpoint para OBTENER todos los usuarios
app.get('/api/users', checkAuth, checkRole(['admin']), (req, res) => {
    userDb.all("SELECT id, username, role FROM usuarios", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Endpoint para CREAR un usuario
app.post('/api/users', checkAuth, checkRole(['admin']), (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: "Faltan datos" });

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ error: err.message });
        userDb.run("INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)", [username, hash, role], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID, username, role });
        });
    });
});

// Endpoint para CAMBIAR CONTRASEÑA de un usuario (Admin)
app.put('/api/users/:id/password', checkAuth, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    
    if (!password) return res.status(400).json({ error: "Falta la nueva contraseña" });

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ error: err.message });
        userDb.run("UPDATE usuarios SET password = ? WHERE id = ?", [hash, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Usuario no encontrado" });
            res.status(200).json({ message: "Contraseña actualizada" });
        });
    });
});

// Endpoint para BORRAR un usuario
app.delete('/api/users/:id', checkAuth, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    // Prevenir borrarse a sí mismo
    if (req.session.user.id === id) {
        return res.status(400).json({ error: "No puedes borrarte a ti mismo" });
    }
    userDb.run("DELETE FROM usuarios WHERE id = ?", id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Usuario borrado" });
    });
});

// Endpoint para obtener el menú
app.get('/api/menu', (req, res) => {
    // Hacemos LEFT JOIN con inventario para obtener el stock si el nombre coincide
    const sql = `
        SELECT m.*, i.cantidad as stock 
        FROM menu m 
        LEFT JOIN inventario i ON m.nombre = i.nombre 
        ORDER BY m.nombre`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error al consultar el menú en la BD:", err.message);
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
});

// Endpoint para OBTENER la configuración del restaurante
app.get('/api/config', (req, res) => { // No necesita autenticación para mostrar logo/nombre en login
    // Enviamos la configuración junto con la tasa de impuesto calculada
    const configWithTax = { ...restaurantConfig };
    configWithTax.tasaImpuesto = TAX_RATES[restaurantConfig.moneda] || 0.15;
    res.json(configWithTax);
});

// Endpoint para ACTUALIZAR la configuración del restaurante
app.post('/api/config', checkAuth, checkRole(['admin']), upload.single('logo'), (req, res) => {
    const updatedConfig = req.body;
    
    // Si se subió un nuevo logo, guardar su ruta
    if (req.file) {
        updatedConfig.logo = `/uploads/${req.file.filename}`;
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
    loadConfig(); // Recargar la configuración en el servidor
    res.status(200).json({ message: 'Configuración guardada con éxito.' });
});

// Endpoint para AÑADIR un nuevo item al menú
app.post('/api/menu', checkAuth, checkRole(['admin']), upload.single('imagen'), (req, res) => {
    const { nombre, categoria } = req.body;
    const precio = parseFloat(req.body.precio);
    const impuesto_incluido = req.body.impuesto_incluido === 'true' ? 1 : 0;
    
    const imagen = req.file ? '/uploads/' + req.file.filename : null;

    const sql = "INSERT INTO menu (nombre, precio, categoria, impuesto_incluido, imagen) VALUES (?, ?, ?, ?, ?)";
    db.run(sql, [nombre, precio, categoria, impuesto_incluido, imagen], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        io.emit('menu_actualizado');
        console.log(`Nuevo item añadido al menú: ${nombre}`);
        res.status(201).json({ id: this.lastID, nombre, precio, categoria, impuesto_incluido, imagen });
    });
});

// Endpoint para BORRAR un item del menú
app.delete('/api/menu/:id', checkAuth, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const sql = "DELETE FROM menu WHERE id = ?";
    db.run(sql, id, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).send('Item no encontrado');
        }
        io.emit('menu_actualizado');
        console.log(`Item con id ${id} borrado del menú.`);
        res.status(204).send();
    });
});

// Endpoint para EDITAR un item del menú
app.put('/api/menu/:id', checkAuth, checkRole(['admin']), upload.single('imagen'), (req, res) => {
    const id = parseInt(req.params.id);
    const { nombre, categoria } = req.body;
    const precio = parseFloat(req.body.precio);
    const impuesto_incluido = req.body.impuesto_incluido === 'true' ? 1 : 0;

    let imagen = req.body.imagen_actual || null;
    if (req.file) {
        imagen = '/uploads/' + req.file.filename;
    }

    const sql = "UPDATE menu SET nombre = ?, precio = ?, categoria = ?, impuesto_incluido = ?, imagen = ? WHERE id = ?";
    db.run(sql, [nombre, precio, categoria, impuesto_incluido, imagen, id], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (this.changes === 0) {
            return res.status(404).send('Item no encontrado');
        }
        io.emit('menu_actualizado');
        console.log(`Item con id ${id} actualizado.`);
        res.status(200).json({ id, nombre, precio, categoria, impuesto_incluido, imagen });
    });
});

// --- Endpoints de Inventario ---

// Obtener inventario
app.get('/api/inventario', checkAuth, checkRole(['admin', 'caja']), (req, res) => {
    db.all("SELECT * FROM inventario ORDER BY nombre", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Agregar item al inventario
app.post('/api/inventario', checkAuth, checkRole(['admin']), (req, res) => {
    const { nombre, cantidad, unidad, minimo } = req.body;
    db.run("INSERT INTO inventario (nombre, cantidad, unidad, minimo) VALUES (?, ?, ?, ?)", 
        [nombre, cantidad, unidad, minimo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// Actualizar item de inventario
app.put('/api/inventario/:id', checkAuth, checkRole(['admin']), (req, res) => {
    const { nombre, cantidad, unidad, minimo } = req.body;
    db.run("UPDATE inventario SET nombre = ?, cantidad = ?, unidad = ?, minimo = ? WHERE id = ?", 
        [nombre, cantidad, unidad, minimo, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Actualizado" });
    });
});

// Borrar item de inventario
app.delete('/api/inventario/:id', checkAuth, checkRole(['admin']), (req, res) => {
    db.run("DELETE FROM inventario WHERE id = ?", req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Eliminado" });
    });
});

// Endpoint para crear una nueva orden
app.post('/api/ordenes', checkAuth, checkRole(['admin', 'caja']), (req, res) => {
    db.serialize(() => {
        const taxRate = TAX_RATES[restaurantConfig.moneda] || 0.15;

        let granSubtotal = 0;
        let granIsv = 0;

        req.body.items.forEach(item => {
            if (item.impuesto_incluido) {
                const itemSubtotal = item.precio / (1 + taxRate);
                granSubtotal += itemSubtotal;
                granIsv += item.precio - itemSubtotal;
            } else {
                granSubtotal += item.precio;
                granIsv += item.precio * taxRate;
            }
        });
        const granTotal = granSubtotal + granIsv;

        const fecha = new Date().toISOString();
        const estado = 'Pendiente';

        db.run('BEGIN TRANSACTION');

        const sqlOrden = `INSERT INTO ordenes (subtotal, isv, total, fecha, estado) VALUES (?, ?, ?, ?, ?)`;
        db.run(sqlOrden, [granSubtotal, granIsv, granTotal, fecha, estado], function (err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }

            const ordenId = this.lastID;
            const sqlItem = `INSERT INTO orden_items (orden_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?)`;
            const itemCounts = {};
            req.body.items.forEach(item => {
                itemCounts[item.nombre] = (itemCounts[item.nombre] || { ...item, cantidad: 0 });
                itemCounts[item.nombre].cantidad++;
            });

            Object.values(itemCounts).forEach(item => {
                db.run(sqlItem, [ordenId, item.nombre, item.precio, item.cantidad]);
                // Descontar del inventario si existe un producto con el mismo nombre
                db.run("UPDATE inventario SET cantidad = cantidad - ? WHERE nombre = ?", [item.cantidad, item.nombre]);
            });

            db.run('COMMIT', (err) => {
                if (err) {
                     return res.status(500).json({ error: err.message });
                }
                const nuevaOrdenCompleta = { id: ordenId, items: req.body.items, subtotal: granSubtotal, isv: granIsv, total: granTotal, fecha, estado };
                console.log(`Nueva orden recibida #${ordenId}`);
                io.emit('nueva_orden', nuevaOrdenCompleta);
                // Notificar a las cajas para que actualicen el stock visualmente
                io.emit('menu_actualizado');
                res.status(201).json(nuevaOrdenCompleta);
            });
        });
    });
});

// Endpoint para OBTENER una orden específica por ID
app.get('/api/ordenes/:id', checkAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const sqlOrden = "SELECT * FROM ordenes WHERE id = ?";
    db.get(sqlOrden, [id], (err, orden) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!orden) return res.status(404).send('Orden no encontrada');

        const sqlItems = "SELECT nombre, precio, cantidad FROM orden_items WHERE orden_id = ?";
        db.all(sqlItems, [id], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Reconstruimos el array de items original para la factura
            const fullItems = [];
            items.forEach(item => {
                for(let i = 0; i < item.cantidad; i++) {
                    fullItems.push({nombre: item.nombre, precio: item.precio});
                }
            });
            orden.items = fullItems;
            res.json(orden);
        });
    });
});

// Endpoint para BORRAR una orden específica (Factura)
app.delete('/api/ordenes/:id', checkAuth, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    db.serialize(() => {
        db.run("DELETE FROM orden_items WHERE orden_id = ?", id);
        db.run("DELETE FROM ordenes WHERE id = ?", id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Orden eliminada" });
        });
    });
});

// Endpoint para OBTENER todas las órdenes pendientes
app.get('/api/ordenes-pendientes', checkAuth, checkRole(['admin', 'caja', 'cocina']), (req, res) => {
    const sql = `SELECT o.id, o.fecha, o.estado, i.nombre, i.cantidad FROM ordenes o JOIN orden_items i ON o.id = i.orden_id WHERE o.estado = 'Pendiente' ORDER BY o.id, i.nombre`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Agrupar items por orden
        const ordenesAgrupadas = rows.reduce((acc, row) => {
            if (!acc[row.id]) {
                acc[row.id] = { id: row.id, fecha: row.fecha, estado: row.estado, items: [] };
            }
            acc[row.id].items.push({ nombre: row.nombre, cantidad: row.cantidad });
            return acc;
        }, {});

        res.json(Object.values(ordenesAgrupadas));
    });
});

// Endpoint para OBTENER el historial completo de ventas
app.get('/api/reportes/historial', checkAuth, checkRole(['admin']), (req, res) => {
    const sql = `
        SELECT o.id, o.fecha, o.subtotal, o.isv, o.total
        FROM ordenes o
        ORDER BY o.id DESC`;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Endpoint para generar REPORTES
app.get('/api/reportes', checkAuth, checkRole(['admin']), (req, res) => {
    const { fechaInicio, fechaFin } = req.query;

    // Convertir las fechas de string a objetos Date. Se añade T23:59:59 a la fecha fin para incluir todo el día.
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T23:59:59');

    // 1. Filtrar órdenes por el rango de fechas
    const sql = `SELECT o.id, o.total, i.nombre, i.cantidad, m.categoria FROM ordenes o 
                 JOIN orden_items i ON o.id = i.orden_id 
                 LEFT JOIN menu m ON i.nombre = m.nombre
                 WHERE o.fecha >= ? AND o.fecha <= ?`;

    db.all(sql, [inicio.toISOString(), fin.toISOString()], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let ventaTotal = 0;
        const ordenesIds = new Set();
        const conteoItems = {};
        let totalPlatillos = 0;
        let totalBebidas = 0;

        rows.forEach(row => {
            // Sumar el total de la venta solo una vez por orden
            if (!ordenesIds.has(row.id)) {
                ventaTotal += row.total;
                ordenesIds.add(row.id);
            }

            // Contar items para el top
            conteoItems[row.nombre] = (conteoItems[row.nombre] || 0) + row.cantidad;

            // Contar categorías
            if (row.categoria === 'Platillo') {
                totalPlatillos += row.cantidad;
            } else if (row.categoria === 'Bebida') {
                totalBebidas += row.cantidad;
            }
        });

        const topItems = Object.entries(conteoItems)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10);

        res.json({
            ventaTotal,
            totalPlatillos,
            totalBebidas,
            topItems
        });
    });
});

// Endpoint para RESETEAR todas las ventas
app.post('/api/ventas/reset', checkAuth, checkRole(['admin']), (req, res) => {
    console.log("Solicitud recibida para resetear el historial de ventas.");
    db.serialize(() => {
        db.run("DELETE FROM orden_items", (err) => {
            if (err) return res.status(500).json({ error: "Error al limpiar items de órdenes: " + err.message });
        });
        db.run("DELETE FROM ordenes", (err) => {
            if (err) return res.status(500).json({ error: "Error al limpiar órdenes: " + err.message });
        });
        // Reiniciar el contador de autoincremento para la tabla de órdenes
        db.run("DELETE FROM sqlite_sequence WHERE name='ordenes'", (err) => {
            if (err) return res.status(500).json({ error: "Error al reiniciar contador de facturas: " + err.message });
            console.log("¡Historial de ventas reseteado con éxito!");
            res.status(200).json({ message: "Historial de ventas reseteado con éxito." });
        });
    });
});

// --- Rutas de Archivos Estáticos y Protegidos ---
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard.html');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Servir archivos públicos (CSS, JS, imágenes)
app.use(express.static('public'));

// --- Lógica de Socket.IO ---
io.on('connection', (socket) => {
    console.log(t.user_connected);

    // Cuando la cocina marca una orden como lista
    socket.on('orden_lista', (ordenId) => {
        const sql = `UPDATE ordenes SET estado = 'Lista' WHERE id = ?`;
        db.run(sql, [ordenId], function (err) {
            if (err) return console.error(err.message);
            if (this.changes > 0) {
                io.emit('actualizar_estado_orden', { id: ordenId, estado: 'Lista' });
                console.log(`Orden #${ordenId} marcada como lista.`);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log(t.user_disconnected);
    });
});


// --- Rutas Protegidas ---
app.get('/dashboard.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/caja.html', checkAuth, checkRole(['admin', 'caja']), (req, res) => res.sendFile(path.join(__dirname, 'public', 'caja.html')));
app.get('/cocina.html', checkAuth, checkRole(['admin', 'caja', 'cocina']), (req, res) => res.sendFile(path.join(__dirname, 'public', 'cocina.html')));
app.get('/admin.html', checkAuth, checkRole(['admin']), (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/reportes.html', checkAuth, checkRole(['admin']), (req, res) => res.sendFile(path.join(__dirname, 'public', 'reportes.html')));
app.get('/factura.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'factura.html')));


// Iniciar el servidor
server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`${t.server_running} ${url}`);
    // console.log(`${t.main_screen} ${url}`);
    // console.log(`${t.pos_screen} ${url}/caja.html`);
    // console.log(`${t.admin_screen} ${url}/admin.html`);
    // console.log(`${t.reports_screen} ${url}/reportes.html`);
    // console.log(`${t.kitchen_screen} ${url}/cocina.html`);

    // Abrir el navegador automáticamente
    if (process.env.NO_OPEN !== 'true') {
        open(url);
    }
});
