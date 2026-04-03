// public/api-proxy.js
// prueba de adaptador: si es Capacitor nativo usa LocalDB (o plugin en futuro), si no usa fetch a los endpoints existentes.

const API = {
    isNative: () => (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()),

    init: async () => {
        if (API.isNative()) {
            await LocalDB.init();
        }
    },

    // Session / auth
    login: async (username, password) => {
        if (API.isNative()) {
            try {
                return await LocalDB.login(username, password);
            } catch (err) {
                throw err;
            }
        }
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Usuario o contraseña incorrectos');
        return await res.json();
    },
    logout: async () => {
        if (API.isNative()) {
            await LocalDB.logout();
            return;
        }
        await fetch('/api/logout', { method: 'POST' });
    },
    getSession: async () => {
        if (API.isNative()) {
            return await LocalDB.getSession();
        }
        const res = await fetch('/api/session');
        if (!res.ok) return null;
        return await res.json();
    },

    // Config
    getConfig: async () => {
        if (API.isNative()) {
            return await LocalDB.getConfig();
        }
        const res = await fetch('/api/config');
        return await res.json();
    },
    saveConfig: async (config, logoFile) => {
        if (API.isNative()) {
            const payload = { ...config };
            if (config.logo) payload.logo = config.logo;
            return await LocalDB.saveConfig(payload);
        }

        const formData = new FormData();
        Object.keys(config).forEach(key => {
            if (key !== 'tasaImpuesto') {
                formData.append(key, config[key] || '');
            }
        });

        if (logoFile) {
            formData.append('logo', logoFile);
        }

        const res = await fetch('/api/config', { method: 'POST', body: formData });
        return await res.json();
    },

    // Menu
    getMenu: async () => {
        if (API.isNative()) {
            return await LocalDB.getMenu();
        }
        const res = await fetch('/api/menu');
        return await res.json();
    },
    addMenuItem: async (item) => {
        if (API.isNative()) {
            return await LocalDB.addMenuItem(item);
        }
        const formData = new FormData();
        Object.entries(item).forEach(([k,v]) => formData.append(k, v));
        const res = await fetch('/api/menu', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Error al crear item');
        return await res.json();
    },
    updateMenuItem: async (id, item) => {
        if (API.isNative()) {
            return await LocalDB.updateMenuItem(id, item);
        }
        const formData = new FormData();
        Object.entries(item).forEach(([k,v]) => formData.append(k, v));
        const res = await fetch(`/api/menu/${id}`, { method: 'PUT', body: formData });
        if (!res.ok) throw new Error('Error al actualizar item');
        return await res.json();
    },
    deleteMenuItem: async (id) => {
        if (API.isNative()) {
            return await LocalDB.deleteMenuItem(id);
        }
        const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
        return res.ok;
    },

    // Clientes
    searchClientes: async (q) => {
        if (API.isNative()) {
            return await LocalDB.searchClientes(q);
        }
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
        return await res.json();
    },
    saveCliente: async (cliente) => {
        if (API.isNative()) {
            if (cliente.id) return await LocalDB.updateCliente(cliente.id, cliente);
            return await LocalDB.createCliente(cliente);
        }
        const method = cliente.id ? 'PUT' : 'POST';
        const url = cliente.id ? `/api/clientes/${cliente.id}` : '/api/clientes';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cliente) });
        return await res.json();
    },

    // Inventario
    getInventario: async () => {
        if (API.isNative()) {
            return await LocalDB.getInventario();
        }
        const res = await fetch('/api/inventario');
        return await res.json();
    },
    addInventarioItem: async (item) => {
        if (API.isNative()) {
            return await LocalDB.addInventarioItem(item);
        }
        const res = await fetch('/api/inventario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        return await res.json();
    },
    updateInventarioItem: async (id, item) => {
        if (API.isNative()) {
            return await LocalDB.updateInventarioItem(id, item);
        }
        const res = await fetch(`/api/inventario/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        return await res.json();
    },
    deleteInventarioItem: async (id) => {
        if (API.isNative()) {
            return await LocalDB.deleteInventarioItem(id);
        }
        const res = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
        return res.ok;
    },

    // Ordenes
    createOrder: async (payload) => {
        if (API.isNative()) {
            return await LocalDB.createOrder(payload);
        }
        const res = await fetch('/api/ordenes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return await res.json();
    },
    getOrderById: async (id) => {
        if (API.isNative()) {
            return await LocalDB.getOrderById(id);
        }
        const res = await fetch(`/api/ordenes/${id}`);
        return await res.json();
    },
    getPendingOrders: async () => {
        if (API.isNative()) {
            return await LocalDB.getPendingOrders();
        }
        const res = await fetch('/api/ordenes-pendientes');
        return await res.json();
    },
    markOrderReady: async (id) => {
        if (API.isNative()) {
            const updated = await LocalDB.updateOrderState(id, 'Lista');
            return updated;
        }
        // En servidor utiliza socket
        return null;
    },
    getOrderHistory: async () => {
        if (API.isNative()) {
            return await LocalDB.getOrderHistory();
        }
        const res = await fetch('/api/reportes/historial');
        return await res.json();
    },

    getSalesReport: async (fechaInicio, fechaFin) => {
        if (API.isNative()) {
            return await LocalDB.getSalesReport(fechaInicio, fechaFin);
        }
        const url = `/api/reportes?fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}`;
        const res = await fetch(url);
        return await res.json();
    },

    resetSales: async () => {
        if (API.isNative()) {
            return await LocalDB.resetSales();
        }
        const res = await fetch('/api/ventas/reset', { method: 'POST' });
        return res.ok;
    },

    // Users (Admin Only)
    getUsers: async () => {
        if (API.isNative()) {
            return await LocalDB.getUsers();
        }
        const res = await fetch('/api/users');
        return await res.json();
    },
    createUser: async (user) => {
        if (API.isNative()) {
            return await LocalDB.createUser(user);
        }
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Error al crear usuario');
        return await res.json();
    },
    updateUser: async (id, fields) => {
        if (API.isNative()) {
            return await LocalDB.updateUser(id, fields);
        }
        const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields)
        });
        if (!res.ok) throw new Error('Error al actualizar usuario');
        return await res.json();
    },
    updateUserPassword: async (id, password) => {
        if (API.isNative()) {
            return await LocalDB.updateUserPassword(id, password);
        }
        const res = await fetch(`/api/users/${id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return res.ok;
    },
    deleteUser: async (id) => {
        if (API.isNative()) {
            return await LocalDB.deleteUser(id);
        }
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        return res.ok;
    }
};
