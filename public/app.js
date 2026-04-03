// public/app.js
// Controlador principal de la aplicación - maneja navegación, sesión y botón atrás Android

class AppController {
    constructor() {
        this.currentView = 'login';
        this.user = null;
        this.navigationStack = ['login'];
        this.setupCapacitorBackButton();
    }

    async init() {
        try {
            // Inicializar API/DB
            await API.init();

            // Verificar si hay sesión activa
            const session = await API.getSession();
            if (session) {
                this.user = session;
                this.goToDashboard();
            } else {
                this.goToLogin();
            }
        } catch (error) {
            console.error('Error inicializando app:', error);
            this.goToLogin();
        }
    }

    showView(viewName) {
        // Buscar la vista en el DOM
        const view = document.querySelector(`[data-view="${viewName}"]`);

        if (view) {
            // Si la vista existe en el DOM (estilo SPA), ocultar las demás y mostrar esta
            document.querySelectorAll('[data-view]').forEach(el => {
                el.style.display = 'none';
            });
            view.style.display = 'block';
            this.currentView = viewName;
            console.log(`Vista activa (SPA): ${viewName}`);
        } else {
            // Si la vista no existe en el DOM, redirigir al archivo HTML correspondiente
            console.log(`Vista no encontrada en DOM, redirigiendo a: ${viewName}`);
            const targetPage = viewName === 'login' ? 'index.html' : `${viewName}.html`;

            // Evitar redirección infinita si ya estamos en la página
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            if (currentPage !== targetPage && !(currentPage === '' && targetPage === 'index.html')) {
                window.location.href = targetPage;
            }
        }
    }

    navigate(viewName, pushToStack = true) {
        if (pushToStack && this.currentView !== viewName) {
            this.navigationStack.push(viewName);
        }
        this.showView(viewName);
    }

    async goBack() {
        if (this.navigationStack.length > 1) {
            this.navigationStack.pop();
            const previousView = this.navigationStack[this.navigationStack.length - 1];
            this.showView(previousView);
        } else if (this.currentView !== 'login') {
            this.goToLogin();
        } else {
            // En login sin historial, minimizar (o salir en móvil)
            if (API.isNative()) {
                console.log('Presionó atrás en login - saliendo');
                try {
                    const AppPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
                    if (AppPlugin) {
                        await AppPlugin.exitApp();
                    }
                } catch (e) {
                    console.warn('No se pudo cerrar app:', e);
                }
            }
        }
    }

    goToLogin() {
        this.user = null;
        this.navigationStack = ['login'];
        this.showView('login');
    }

    goToDashboard() {
        this.navigationStack = ['login', 'dashboard'];
        this.showView('dashboard');
    }

    async logout() {
        try {
            await API.logout();
            this.goToLogin();
        } catch (error) {
            console.error('Error en logout:', error);
            this.goToLogin();
        }
    }

    setupCapacitorBackButton() {
        if (typeof window.Capacitor !== 'undefined' && 
            window.Capacitor.isNativePlatform && 
            window.Capacitor.isNativePlatform()) {
            
            setTimeout(async () => {
                try {
                    const AppPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
                    if (AppPlugin) {
                        AppPlugin.addListener('backButton', async () => {
                            await this.goBack();
                        });
                    }
                } catch (error) {
                    console.warn('Back button listener no disponible:', error);
                }
            }, 500);
        }
    }
}

// Instancia global
const App = new AppController();
