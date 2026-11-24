const { getDb } = require("../db");

function get() {
  const tienda = getDb()
    .prepare("SELECT * FROM tienda_configuracion WHERE id = 1")
    .get();
  if (!tienda) throw new Error("No se encontró la información de la tienda.");
  return tienda;
}

function update(data) {
  getDb()
    .prepare(`
      UPDATE tienda_configuracion SET
        nombre_comercial = @nombre_comercial,
        nombre_titular = @nombre_titular,
        tipo_titular = @tipo_titular,
        tipo_identificacion = @tipo_identificacion,
        numero_identificacion = @numero_identificacion,
        actividad_economica = @actividad_economica,
        regimen_tributario = @regimen_tributario,
        telefono = @telefono,
        correo = @correo,
        pais = @pais,
        provincia = @provincia,
        canton = @canton,
        distrito = @distrito,
        direccion = @direccion,
        ubicacion_referencia = @ubicacion_referencia,
        acepta_efectivo = @acepta_efectivo,
        acepta_sinpe = @acepta_sinpe,
        acepta_tarjeta = @acepta_tarjeta,
        moneda_codigo = @moneda_codigo,
        simbolo_moneda = @simbolo_moneda,
        actualizado = datetime('now')
      WHERE id = 1
    `)
    .run({
      ...data,
      acepta_efectivo: data.acepta_efectivo ? 1 : 0,
      acepta_sinpe: data.acepta_sinpe ? 1 : 0,
      acepta_tarjeta: data.acepta_tarjeta ? 1 : 0,
    });

  return get();
}

module.exports = { get, update };
