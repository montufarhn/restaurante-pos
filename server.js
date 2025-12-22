// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const open = require('open');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

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
                logo: "" // path al logo
            };
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(restaurantConfig, null, 2));
        }
    } catch (error) {
        console.error("Error al cargar o crear el archivo de configuración:", error);
    }
}
loadConfig(); // Cargar la configuración al iniciar

// --- Conexión a la Base de Datos SQLite ---
const db = new sqlite3.Database('./restaurante.db', (err) => {
    if (err) {
        console.error("Error al abrir la base de datos", err.message);
    } else {
        console.log("Conectado a la base de datos SQLite.");
        // Serializar las operaciones para asegurar el orden de ejecución
        db.serialize(() => {
            // Crear la tabla si no existe
            db.run(`CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                categoria TEXT NOT NULL
            )`, (err) => {
                if (err) return console.error("Error al crear la tabla 'menu'", err.message);
            });

            // Verificar y añadir la columna 'impuesto_incluido' si no existe
            db.all("PRAGMA table_info(menu)", (err, columns) => {
                if (err) return console.error("Error al leer la información de la tabla 'menu'", err.message);
                
                const hasTaxColumn = columns.some(col => col.name === 'impuesto_incluido');
                if (!hasTaxColumn) {
                    console.log("Añadiendo columna 'impuesto_incluido' a la tabla 'menu'...");
                    db.run("ALTER TABLE menu ADD COLUMN impuesto_incluido INTEGER DEFAULT 1 NOT NULL", (err) => {
                        if (err) return console.error("Error al añadir la columna 'impuesto_incluido'", err.message);
                        console.log("Columna 'impuesto_incluido' añadida con éxito.");
                    });
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

            db.get("SELECT COUNT(*) as count FROM menu", (err, row) => {
                // (Código para poblar el menú si está vacío, sin cambios)
            });
        });
    }
});

// --- Configuración del Servidor ---
app.use(express.static('public')); // Servir archivos estáticos (HTML, CSS)
app.use(express.json()); // Permitir que el servidor entienda JSON

// --- API Endpoints ---

// Endpoint para obtener el menú
app.get('/api/menu', (req, res) => {
    db.all("SELECT * FROM menu ORDER BY nombre", [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
});

// Endpoint para OBTENER la configuración del restaurante
app.get('/api/config', (req, res) => {
    res.json(restaurantConfig);
});

// Endpoint para ACTUALIZAR la configuración del restaurante
app.post('/api/config', upload.single('logo'), (req, res) => {
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
app.post('/api/menu', upload.single('imagen'), (req, res) => {
    const { nombre, precio, categoria } = req.body;
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
app.delete('/api/menu/:id', (req, res) => {
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
app.put('/api/menu/:id', upload.single('imagen'), (req, res) => {
    const id = parseInt(req.params.id);
    const { nombre, precio, categoria } = req.body;
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


// Endpoint para crear una nueva orden
app.post('/api/ordenes', (req, res) => {
    db.serialize(() => {
        let granSubtotal = 0;
        let granIsv = 0;

        req.body.items.forEach(item => {
            if (item.impuesto_incluido) {
                const itemSubtotal = item.precio / 1.15;
                granSubtotal += itemSubtotal;
                granIsv += item.precio - itemSubtotal;
            } else {
                granSubtotal += item.precio;
                granIsv += item.precio * 0.15;
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
            });

            db.run('COMMIT', (err) => {
                if (err) {
                     return res.status(500).json({ error: err.message });
                }
                const nuevaOrdenCompleta = { id: ordenId, items: req.body.items, subtotal: granSubtotal, isv: granIsv, total: granTotal, fecha, estado };
                console.log(`Nueva orden recibida #${ordenId}`);
                io.emit('nueva_orden', nuevaOrdenCompleta);
                res.status(201).json(nuevaOrdenCompleta);
            });
        });
    });
});

// Endpoint para OBTENER una orden específica por ID
app.get('/api/ordenes/:id', (req, res) => {
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

// Endpoint para OBTENER todas las órdenes pendientes
app.get('/api/ordenes-pendientes', (req, res) => {
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
app.get('/api/reportes/historial', (req, res) => {
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
app.get('/api/reportes', (req, res) => {
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
app.post('/api/ventas/reset', (req, res) => {
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

// --- Lógica de Socket.IO ---
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');

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
        console.log('Un usuario se ha desconectado');
    });
});


// Iniciar el servidor
server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Servidor corriendo en ${url}`);
    console.log(`- Pantalla Principal: ${url}`);
    console.log(`- Caja/POS: ${url}/caja.html`);
    console.log(`- Administración: ${url}/admin.html`);
    console.log(`- Reportes: ${url}/reportes.html`);
    console.log(`- Cocina/KDS: ${url}/cocina.html`);

    // Abrir el navegador automáticamente
    open(url);
});
