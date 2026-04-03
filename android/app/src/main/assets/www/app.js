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
        // Ocultar todas las vistas
        document.querySelectorAll('[data-view]').forEach(el => {
            el.style.display = 'none';
        });

        // Mostrar vista solicitada
        const view = document.querySelector(`[data-view="${viewName}"]`);
        if (view) {
            view.style.display = 'block';
            this.currentView = viewName;
            console.log(`Vista activa: ${viewName}`);
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
                // Capacitor App close
                try {
                    const { App } = await import('@capacitor/app');
                    App.exitApp();
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
            
            (async () => {
                try {
                    const { App } = await import('@capacitor/app');
                    App.addListener('backButton', async () => {
                        await this.goBack();
                    });
                } catch (error) {
                    console.warn('Back button listener no disponible:', error);
                }
            })();
        }
    }
}

// Instancia global
const App = new AppController();
