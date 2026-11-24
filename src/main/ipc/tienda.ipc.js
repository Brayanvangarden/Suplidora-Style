const { ipcMain } = require("electron");
const tiendaRepository = require("../database/repositories/tienda.repository");
const { validarTienda } = require("../shared/validators/tienda.validator");

function registerTiendaIpc() {
  ipcMain.handle("tienda:get", async () => {
    try {
      return { ok: true, data: tiendaRepository.get() };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  ipcMain.handle("tienda:update", async (_, payload) => {
    try {
      const validacion = validarTienda(payload);
      if (!validacion.ok) return validacion;
      return {
        ok: true,
        data: tiendaRepository.update(validacion.data),
        message: "Información de la tienda guardada correctamente.",
      };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });
}

module.exports = { registerTiendaIpc };
