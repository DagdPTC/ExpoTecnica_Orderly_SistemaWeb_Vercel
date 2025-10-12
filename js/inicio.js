// ==========================
// main.js
// Punto de entrada del dashboard
// ==========================
import { DashboardController } from './jsControllers/ControllerScript.js';

// Inicializar el dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await DashboardController.init({
      topN: 6,
      autoRefreshMs: 45000,
      useAbortOnRefresh: true
    });
    console.log(' Dashboard inicializado correctamente');
  } catch (error) {
    console.error(' Error al inicializar dashboard:', error);
  }
});