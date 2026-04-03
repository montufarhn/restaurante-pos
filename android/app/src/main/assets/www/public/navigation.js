// public/navigation.js
// Sistema de navegación para Capacitor con manejo de botón atrás Android

class NavigationStack {
    constructor() {
        this.stack = [{ view: 'login', params: {} }];
        this.currentViewIndex = 0;
        this.views = {};
        this.setupCapacitorBackButton();
    }

    registerView(name, viewElement, initFunction) {
        this.views[name] = { element: viewElement, init: initFunction };
    }

    async navigate(viewName, params = {}) {
        // Limpiar vista actual
        const currentView = this.stack[this.currentViewIndex];
        if (this.views[currentView.view]) {
            this.views[currentView.view].element.style.display = 'none';
        }

        // Agregar a stack si es diferente a la actual
        if (this.stack[this.currentViewIndex].view !== viewName) {
            this.stack = this.stack.slice(0, this.currentViewIndex + 1);
            this.stack.push({ view: viewName, params });
            this.currentViewIndex++;
        }

        // Mostrar nueva vista
        if (this.views[viewName]) {
            this.views[viewName].element.style.display = 'block';
            if (this.views[viewName].init) {
                await this.views[viewName].init(params);
            }
        }

        console.log(`Navegó a: ${viewName}`, this.stack);
    }

    async goBack() {
        if (this.currentViewIndex > 0) {
            const currentView = this.stack[this.currentViewIndex];
            if (this.views[currentView.view]) {
                this.views[currentView.view].element.style.display = 'none';
            }

            this.currentViewIndex--;
            const prevView = this.stack[this.currentViewIndex];

            if (this.views[prevView.view]) {
                this.views[prevView.view].element.style.display = 'block';
                if (this.views[prevView.view].init) {
                    await this.views[prevView.view].init(prevView.params);
                }
            }
            console.log(`Volvió a: ${prevView.view}`);
        } else if (this.stack[this.currentViewIndex].view !== 'login') {
            // Si estamos al inicio del stack y no es login, volver a login
            await this.navigate('login');
        } else {
            // Si estamos en login y es el inicio, minimizar app o salir
            if (API.isNative()) {
                const { App } = await import('@capacitor/app');
                App.exitApp();
            } else {
                // En web, solo mostrar un aviso
                console.log('Al inicio de la app');
            }
        }
    }

    setupCapacitorBackButton() {
        // Solo cargar en modo Capacitor
        if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
            (async () => {
                try {
                    const { App } = await import('@capacitor/app');
                    App.addListener('backButton', async ({ canGoBack }) => {
                        if (canGoBack) {
                            window.history.back();
                        } else {
                            await this.goBack();
                        }
                    });
                } catch (error) {
                    console.warn('Capacitor back button no disponible:', error);
                }
            })();
        }
    }

    getCurrentView() {
        return this.stack[this.currentViewIndex];
    }
}

// Instancia global
const Navigation = new NavigationStack();
