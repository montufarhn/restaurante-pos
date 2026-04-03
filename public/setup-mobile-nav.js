// public/setup-mobile-nav.js
// Inyecta sistema de navegación mobile en todas las páginas

function setupMobileNavigation() {
    // Agregar botón atrás en la esquina superior izquierda
    const backButtonHTML = `
        <button id="back-button-mobile" style="
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 18px;
            cursor: pointer;
            z-index: 9999;
            display: none;
        ">← Atrás</button>
    `;
    
    // Insertar botón al inicio del body
    document.body.insertAdjacentHTML('afterbegin', backButtonHTML);
    
    const backBtn = document.getElementById('back-button-mobile');
    
    // Mostrar botón solo si no estamos en la primera página
    if (window.parent !== window) {
        backBtn.style.display = 'block';
    }
    
    // Lógica del botón atrás
    if (backBtn) {
        backBtn.addEventListener('click', async () => {
            if (typeof App !== 'undefined' && App.goBack) {
                await App.goBack();
            } else {
                window.history.back();
            }
        });
    }
    
    // Si estamos en Capacitor, mostrar siempre el botón atrás
    if (API.isNative()) {
        backBtn.style.display = 'block';
    }
    
    // Cambiar todos los links internos a usar App.navigate
    document.querySelectorAll('a[href^="/"]').forEach(link => {
        const href = link.getAttribute('href');
        // No cambiar links de descarga o logout
        if (!href.includes('.apk') && !href.includes('logout')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = href.replace(/^\//, '').replace(/\.html$/, '');
                if (typeof App !== 'undefined' && App.navigate) {
                    App.navigate(page);
                } else {
                    window.location.href = href;
                }
            });
        }
    });
    
    // Manejar logout
    const logoutButtons = document.querySelectorAll('[data-action="logout"]');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (typeof App !== 'undefined' && App.logout) {
                await App.logout();
            }
        });
    });
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileNavigation);
} else {
    setupMobileNavigation();
}
