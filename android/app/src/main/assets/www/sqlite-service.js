// public/sqlite-service.js
// Servicio de datos local pensado para móvil (Android via Capacitor) + fallback web con localStorage.

const TAX_RATES = {
    "L.": 0.15,
    "BZ$": 0.125,
    "Q": 0.12,
    "$": 0.08,
    "€": 0.20,
    "£": 0.20,
    "¥": 0.10,
    "CN¥": 0.13
};

const isCapacitorPlatform = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const useCapacitorSqlite = isCapacitorPlatform && !!window.CapacitorSQLite;

let capacitorConn = null;

async function initCapacitorSQLite() {
    if (!useCapacitorSqlite) return;

    try {
        // Se asume que @capacitor-community/sqlite está instalado y disponible.
        const SQLiteConnection = window.SQLiteConnection || window.CapacitorSQLite?.SQLiteConnection;
        if (!SQLiteConnection) {
            console.warn('Capacitor SQLite no disponible');
            return;
        }

        const sqliteConnObj = new SQLiteConnection(window.CapacitorSQLite);
        capacitorConn = await sqliteConnObj.createConnection('restaurantepos', false, 'no-encryption', 1);
        await capacitorConn.open();

        const statements = `
            CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                categoria TEXT NOT NULL,
                impuesto_incluido INTEGER DEFAULT 1 NOT NULL,
                imagen TEXT
            );
            CREATE TABLE IF NOT EXISTS ordenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subtotal REAL NOT NULL,
                isv REAL NOT NULL,
                total REAL NOT NULL,
                fecha TEXT NOT NULL,
                estado TEXT NOT NULL,
                cliente_nombre TEXT,
                cliente_rtn TEXT
            );
            CREATE TABLE IF NOT EXISTS orden_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orden_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                cantidad INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS inventario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                cantidad REAL DEFAULT 0,
                unidad TEXT DEFAULT 'unidades',
                minimo REAL DEFAULT 5
            );
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                rtn TEXT
            );
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                rtn TEXT,
                cai TEXT,
                rangoInicio TEXT,
                rangoFin TEXT,
                idioma TEXT,
                moneda TEXT,
                logo TEXT
            );
        `;

        await capacitorConn.execute({ statements });

        // Seed usuarios/config if no data
        const queryUsers = await capacitorConn.query({ statement: 'SELECT COUNT(*) as count FROM usuarios', values: [] });
        if (!queryUsers.values || queryUsers.values.length === 0 || queryUsers.values[0].count === 0) {
            await capacitorConn.execute({ statements: `INSERT INTO usuarios (username, password, role) VALUES ('admin', 'admin', 'admin'), ('caja', 'caja', 'caja'), ('cocina', 'cocina', 'cocina');` });
        }

        const queryCfg = await capacitorConn.query({ statement: 'SELECT COUNT(*) as count FROM config', values: [] });
        if (!queryCfg.values || queryCfg.values.length === 0 || queryCfg.values[0].count === 0) {
            await capacitorConn.execute({ statements: `INSERT INTO config (nombre,rtn,cai,rangoInicio,rangoFin,idioma,moneda,logo) VALUES ('','','','','','es','L.','')` });
        }

    } catch (error) {
        console.error('Error inicializando Capacitor SQLite', error);
        capacitorConn = null;
    }
}

async function capQuery(statement, values = []) {
    if (!capacitorConn) throw new Error('Capacitor DB no inicializada');
    const result = await capacitorConn.query({ statement, values });
    return result.values || [];
}

async function capExecute(statement) {
    if (!capacitorConn) throw new Error('Capacitor DB no inicializada');
    await capacitorConn.execute({ statements: statement });
    return true;
}

const LocalDB = (function () {
    const STORAGE_KEY = 'restaurante_pos_offline_v1';
    let data = null;

    function defaults() {
        return {
            menu: [],
            ordenes: [],
            orden_items: [],
            inventario: [],
            clientes: [],
            usuarios: [
                { id: 1, username: 'admin', password: 'admin', role: 'admin' },
                { id: 2, username: 'caja', password: 'caja', role: 'caja' },
                { id: 3, username: 'cocina', password: 'cocina', role: 'cocina' }
            ],
            config: {
                nombre: '',
                rtn: '',
                cai: '',
                rangoInicio: '',
                rangoFin: '',
                idioma: 'es',
                moneda: 'L.',
                logo: ''
            }
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('LocalDB: error al leer storage, se restablece', e);
            return null;
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('LocalDB: error al guardar en localStorage', e);
        }
    }

    let isCapacitorMode = false;

    function ensureInitialized() {
        if (data) return;
        data = load() || defaults();
        save();
    }

    function nextId(arr) {
        if (!arr || !arr.length) return 1;
        return Math.max(...arr.map(i => i.id)) + 1;
    }

    function getTaxRate() {
        return TAX_RATES[data.config.moneda] || 0.15;
    }

    return {
        init: async () => {
            if (useCapacitorSqlite) {
                await initCapacitorSQLite();
                if (capacitorConn) {
                    isCapacitorMode = true;
                    console.log('LocalDB: modo Capacitor SQLite habilitado');
                }
            }
            ensureInitialized();
        },

        // Usuarios / sesión
        login: async (username, password) => {
            ensureInitialized();
            const user = data.usuarios.find(u => u.username === username && u.password === password);
            if (!user) throw new Error('Usuario o contraseña incorrectos');
            localStorage.setItem('restaurante_pos_session', JSON.stringify({ id: user.id, username: user.username, role: user.role }));
            return { id: user.id, username: user.username, role: user.role };
        },
        logout: async () => {
            localStorage.removeItem('restaurante_pos_session');
        },
        getSession: async () => {
            const raw = localStorage.getItem('restaurante_pos_session');
            if (!raw) return null;
            return JSON.parse(raw);
        },

        // Config
        getConfig: async () => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const rows = await capQuery('SELECT * FROM config LIMIT 1', []);
                if (rows && rows.length) {
                    const cfg = rows[0];
                    return {
                        nombre: cfg.nombre || '',
                        rtn: cfg.rtn || '',
                        cai: cfg.cai || '',
                        rangoInicio: cfg.rangoInicio || '',
                        rangoFin: cfg.rangoFin || '',
                        idioma: cfg.idioma || 'es',
                        moneda: cfg.moneda || 'L.',
                        logo: cfg.logo || ''
                    };
                }
            }
            return data.config;
        },
        saveConfig: async (configUpdates) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const current = data.config;
                const updated = { ...current, ...configUpdates };
                await capExecute(`UPDATE config SET nombre='${updated.nombre}', rtn='${updated.rtn}', cai='${updated.cai}', rangoInicio='${updated.rangoInicio}', rangoFin='${updated.rangoFin}', idioma='${updated.idioma}', moneda='${updated.moneda}', logo='${updated.logo}' WHERE id=1`);
                data.config = updated;
                return updated;
            }
            data.config = { ...data.config, ...configUpdates };
            save();
            return data.config;
        },

        // Menu
        getMenu: async () => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const rows = await capQuery('SELECT * FROM menu', []);
                return rows || [];
            }
            return data.menu;
        },
        addMenuItem: async (item) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const stmt = `INSERT INTO menu (nombre, precio, categoria, impuesto_incluido, imagen) VALUES ('${item.nombre.replace("'","''")}', ${item.precio}, '${item.categoria}', ${item.impuesto_incluido ? 1 : 0}, '${item.imagen || ''}')`;
                await capExecute(stmt);
                const rows = await capQuery('SELECT * FROM menu ORDER BY id DESC LIMIT 1', []);
                return rows[0] || null;
            }
            const newItem = { id: nextId(data.menu), ...item };
            data.menu.push(newItem);
            save();
            return newItem;
        },
        updateMenuItem: async (id, fields) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const updateFields = Object.entries(fields).map(([k,v]) => {
                    const safe = typeof v === 'string' ? `'${v.replace("'","''")}'` : v;
                    return `${k}=${safe}`;
                }).join(', ');
                await capExecute(`UPDATE menu SET ${updateFields} WHERE id=${id}`);
                const rows = await capQuery('SELECT * FROM menu WHERE id=?', [id]);
                return rows[0];
            }
            const index = data.menu.findIndex(i => i.id === id);
            if (index < 0) throw new Error('Item no encontrado');
            data.menu[index] = { ...data.menu[index], ...fields };
            save();
            return data.menu[index];
        },
        deleteMenuItem: async (id) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                await capExecute(`DELETE FROM menu WHERE id=${id}`);
                return true;
            }
            const index = data.menu.findIndex(i => i.id === id);
            if (index < 0) throw new Error('Item no encontrado');
            data.menu.splice(index, 1);
            save();
            return true;
        },

        // Clientes
        searchClientes: async (q) => {
            ensureInitialized();
            if (!q) return [];
            if (isCapacitorMode && capacitorConn) {
                const term = q.toLowerCase();
                const rows = await capQuery(`SELECT * FROM clientes WHERE LOWER(nombre) LIKE '%${term}%' OR LOWER(rtn) LIKE '%${term}%' LIMIT 10`, []);
                return rows || [];
            }
            const lower = q.toLowerCase();
            return data.clientes.filter(c => c.nombre.toLowerCase().includes(lower) || (c.rtn || '').toLowerCase().includes(lower)).slice(0, 10);
        },
        createCliente: async (cliente) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                await capExecute(`INSERT INTO clientes (nombre, rtn) VALUES ('${cliente.nombre.replace("'","''")}', '${cliente.rtn || ''}')`);
                const rows = await capQuery('SELECT * FROM clientes ORDER BY id DESC LIMIT 1', []);
                return rows[0] || null;
            }
            const newCliente = { id: nextId(data.clientes), ...cliente };
            data.clientes.push(newCliente);
            save();
            return newCliente;
        },
        updateCliente: async (id, cliente) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const updates = Object.entries(cliente).map(([k,v]) => `${k}='${v.replace("'","''")}'`).join(', ');
                await capExecute(`UPDATE clientes SET ${updates} WHERE id=${id}`);
                const rows = await capQuery('SELECT * FROM clientes WHERE id=?', [id]);
                return rows[0];
            }
            const index = data.clientes.findIndex(c => c.id === id);
            if (index < 0) throw new Error('Cliente no encontrado');
            data.clientes[index] = { ...data.clientes[index], ...cliente };
            save();
            return data.clientes[index];
        },

        // Inventario
        getInventario: async () => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const rows = await capQuery('SELECT * FROM inventario', []);
                return rows || [];
            }
            return data.inventario;
        },
        addInventarioItem: async (item) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                await capExecute(`INSERT INTO inventario (nombre, cantidad, unidad, minimo) VALUES ('${item.nombre.replace("'","''")}', ${item.cantidad || 0}, '${item.unidad || 'unidades'}', ${item.minimo || 5})`);
                const rows = await capQuery('SELECT * FROM inventario ORDER BY id DESC LIMIT 1', []);
                return rows[0] || null;
            }
            const newItem = { id: nextId(data.inventario), ...item };
            data.inventario.push(newItem);
            save();
            return newItem;
        },
        updateInventarioItem: async (id, item) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const updates = Object.entries(item).map(([k,v]) => `${k}='${v.toString().replace("'","''")}'`).join(', ');
                await capExecute(`UPDATE inventario SET ${updates} WHERE id=${id}`);
                const rows = await capQuery('SELECT * FROM inventario WHERE id=?', [id]);
                return rows[0];
            }
            const index = data.inventario.findIndex(i => i.id === id);
            if (index < 0) throw new Error('Inventario no encontrado');
            data.inventario[index] = { ...data.inventario[index], ...item };
            save();
            return data.inventario[index];
        },
        deleteInventarioItem: async (id) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                await capExecute(`DELETE FROM inventario WHERE id=${id}`);
                return true;
            }
            data.inventario = data.inventario.filter(i => i.id !== id);
            save();
            return true;
        },

        // Ordenes
        createOrder: async ({ items, cliente_nombre, cliente_rtn }) => {
            ensureInitialized();
            if (!Array.isArray(items) || items.length === 0) throw new Error('La orden debe tener al menos un item');

            let granSubtotal = 0;
            let granIsv = 0;
            const taxRate = getTaxRate();

            items.forEach(item => {
                const precio = parseFloat(item.precio) || 0;
                if (item.impuesto_incluido || item.impuesto_incluido === 1 || item.impuesto_incluido === true) {
                    const subtotalItem = precio / (1 + taxRate);
                    granSubtotal += subtotalItem;
                    granIsv += precio - subtotalItem;
                } else {
                    granSubtotal += precio;
                    granIsv += precio * taxRate;
                }
            });

            const total = granSubtotal + granIsv;
            const fecha = new Date().toISOString();

            if (isCapacitorMode && capacitorConn) {
                await capExecute(`INSERT INTO ordenes (subtotal, isv, total, fecha, estado, cliente_nombre, cliente_rtn) VALUES (${granSubtotal}, ${granIsv}, ${total}, '${fecha}', 'Pendiente', '${(cliente_nombre||'').replace("'","''")}', '${(cliente_rtn||'').replace("'","''")}')`);
                const ordenRows = await capQuery('SELECT * FROM ordenes ORDER BY id DESC LIMIT 1', []);
                const newOrden = ordenRows[0];
                const itemCounts = {};
                items.forEach(item => {
                    const key = item.nombre + '_' + item.precio;
                    itemCounts[key] = itemCounts[key] || { nombre: item.nombre, precio: parseFloat(item.precio), cantidad: 0 };
                    itemCounts[key].cantidad += 1;
                });

                for (const it of Object.values(itemCounts)) {
                    await capExecute(`INSERT INTO orden_items (orden_id, nombre, precio, cantidad) VALUES (${newOrden.id}, '${it.nombre.replace("'","''")}', ${it.precio}, ${it.cantidad})`);
                    const inv = await capQuery(`SELECT * FROM inventario WHERE nombre='${it.nombre.replace("'","''")}'`, []);
                    if (inv && inv.length) {
                        const cantidadActual = parseFloat(inv[0].cantidad) || 0;
                        const nueva = Math.max(0, cantidadActual - it.cantidad);
                        await capExecute(`UPDATE inventario SET cantidad=${nueva} WHERE id=${inv[0].id}`);
                    }
                }

                return { ...newOrden, items };
            }

            const ordenId = nextId(data.ordenes);
            const newOrden = { id: ordenId, subtotal: granSubtotal, isv: granIsv, total, fecha, estado: 'Pendiente', cliente_nombre: cliente_nombre || null, cliente_rtn: cliente_rtn || null };
            data.ordenes.push(newOrden);

            const itemCounts = {};
            items.forEach(item => {
                const key = item.nombre + '_' + item.precio;
                itemCounts[key] = itemCounts[key] || { nombre: item.nombre, precio: parseFloat(item.precio), cantidad: 0 };
                itemCounts[key].cantidad += 1;
            });

            Object.values(itemCounts).forEach(it => {
                data.orden_items.push({ id: nextId(data.orden_items), orden_id: ordenId, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad });
            });

            Object.values(itemCounts).forEach(it => {
                const inv = data.inventario.find(i => i.nombre === it.nombre);
                if (inv) {
                    inv.cantidad = Math.max(0, parseFloat(inv.cantidad) - it.cantidad);
                }
            });

            save();
            return { ...newOrden, items };
        },

        getOrderById: async (id) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const ordenRows = await capQuery('SELECT * FROM ordenes WHERE id=?', [id]);
                if (!ordenRows || ordenRows.length === 0) throw new Error('Orden no encontrada');
                const orden = ordenRows[0];
                const itemRows = await capQuery('SELECT * FROM orden_items WHERE orden_id=?', [id]);
                const items = itemRows || [];
                return { ...orden, items };
            }
            const orden = data.ordenes.find(o => o.id === id);
            if (!orden) throw new Error('Orden no encontrada');
            const items = data.orden_items.filter(i => i.orden_id === id).flatMap(item => Array(item.cantidad).fill({ nombre: item.nombre, precio: item.precio, cantidad: item.cantidad }));
            return { ...orden, items };
        },

        getPendingOrders: async () => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const pending = await capQuery("SELECT * FROM ordenes WHERE estado='Pendiente'", []);
                const out=[];
                for (const orden of pending) {
                    const items = await capQuery('SELECT * FROM orden_items WHERE orden_id=?', [orden.id]);
                    const itemsAgg = {};
                    (items || []).forEach(i=>{
                        itemsAgg[i.nombre] = (itemsAgg[i.nombre]||0)+i.cantidad;
                    });
                    out.push({ ...orden, items: Object.entries(itemsAgg).map(([nombre,cantidad])=>({nombre,cantidad})) });
                }
                return out;
            }
            const pending = data.ordenes.filter(o => o.estado === 'Pendiente');
            const out=[];
            pending.forEach(orden=>{
                const itemsAgg = {};
                data.orden_items.filter(i=>i.orden_id===orden.id).forEach(i=>{
                    itemsAgg[i.nombre] = (itemsAgg[i.nombre]||0)+i.cantidad;
                });
                out.push({ ...orden, items: Object.entries(itemsAgg).map(([nombre,cantidad])=>({nombre,cantidad})) });
            });
            return out;
        },

        updateOrderState: async (id, nuevoEstado) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                await capExecute(`UPDATE ordenes SET estado='${nuevoEstado}' WHERE id=${id}`);
                const rows = await capQuery('SELECT * FROM ordenes WHERE id=?', [id]);
                return rows[0];
            }
            const orden = data.ordenes.find(o => o.id === id);
            if (!orden) throw new Error('Orden no encontrada');
            orden.estado = nuevoEstado;
            save();
            return orden;
        },

        getOrderHistory: async () => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                const rows = await capQuery('SELECT id, subtotal, isv, total, fecha FROM ordenes ORDER BY id DESC', []);
                return rows || [];
            }
            return data.ordenes.map(o => ({ id: o.id, subtotal: o.subtotal, isv: o.isv, total: o.total, fecha:o.fecha }))
                .sort((a,b)=>b.id-a.id);
        },

        getSalesReport: async (fechaInicio, fechaFin) => {
            ensureInitialized();
            const inicio = new Date(`${fechaInicio}T00:00:00`);
            const fin = new Date(`${fechaFin}T23:59:59`);

            if (isCapacitorMode && capacitorConn) {
                const ordenes = await capQuery('SELECT * FROM ordenes', []);
                let ventaTotal = 0;
                let totalPlatillos = 0;
                let totalBebidas = 0;
                const conteoItems = {};

                for (const orden of ordenes) {
                    const fecha = new Date(orden.fecha);
                    if (fecha >= inicio && fecha <= fin) {
                        ventaTotal += orden.total;
                        const items = await capQuery('SELECT * FROM orden_items WHERE orden_id=?', [orden.id]);
                        for (const i of items) {
                            conteoItems[i.nombre] = (conteoItems[i.nombre] || 0) + i.cantidad;
                            const menuItemRow = await capQuery('SELECT * FROM menu WHERE nombre=? LIMIT 1', [i.nombre]);
                            const menuItem = menuItemRow[0];
                            if (menuItem && menuItem.categoria === 'Platillo') totalPlatillos += i.cantidad;
                            if (menuItem && menuItem.categoria === 'Bebida') totalBebidas += i.cantidad;
                        }
                    }
                }

                const topItems = Object.entries(conteoItems)
                    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                    .sort((a, b) => b.cantidad - a.cantidad)
                    .slice(0, 10);

                return { ventaTotal, totalPlatillos, totalBebidas, topItems };
            }

            const ordenes = data.ordenes.filter(o => {
                const fecha = new Date(o.fecha);
                return fecha >= inicio && fecha <= fin;
            });

            let ventaTotal = 0;
            let totalPlatillos = 0;
            let totalBebidas = 0;
            const conteoItems = {};

            ordenes.forEach(orden => {
                ventaTotal += orden.total;
                const items = data.orden_items.filter(i => i.orden_id === orden.id);
                items.forEach(i => {
                    conteoItems[i.nombre] = (conteoItems[i.nombre] || 0) + i.cantidad;
                    const menuItem = data.menu.find(m => m.nombre === i.nombre);
                    if (menuItem && menuItem.categoria === 'Platillo') totalPlatillos += i.cantidad;
                    if (menuItem && menuItem.categoria === 'Bebida') totalBebidas += i.cantidad;
                });
            });

            const topItems = Object.entries(conteoItems)
                .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                .sort((a, b) => b.cantidad - a.cantidad)
                .slice(0, 10);

            return { ventaTotal, totalPlatillos, totalBebidas, topItems };
        },

        deleteOrder: async (id) => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                await capExecute(`DELETE FROM orden_items WHERE orden_id=${id}`);
                await capExecute(`DELETE FROM ordenes WHERE id=${id}`);
                return true;
            }
            data.orden_items = data.orden_items.filter(i => i.orden_id !== id);
            data.ordenes = data.ordenes.filter(o => o.id !== id);
            save();
            return true;
        },

        resetSales: async () => {
            ensureInitialized();
            if (isCapacitorMode && capacitorConn) {
                await capExecute('DELETE FROM orden_items');
                await capExecute('DELETE FROM ordenes');
                return true;
            }
            data.ordenes = [];
            data.orden_items = [];
            save();
            return true;
        }
    };
})();
