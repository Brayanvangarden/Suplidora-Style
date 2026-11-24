function normalizeTienda(tienda) {
  return {
    nombreComercial: tienda.nombre_comercial,
    nombreTitular: tienda.nombre_titular,
    tipoTitular: tienda.tipo_titular,
    tipoIdentificacion: tienda.tipo_identificacion,
    numeroIdentificacion: tienda.numero_identificacion,
    actividadEconomica: tienda.actividad_economica,
    regimenTributario: tienda.regimen_tributario,
    telefono: tienda.telefono,
    correo: tienda.correo,
    pais: tienda.pais,
    provincia: tienda.provincia,
    canton: tienda.canton,
    distrito: tienda.distrito,
    direccion: tienda.direccion,
    ubicacionReferencia: tienda.ubicacion_referencia,
    metodosPago: {
      efectivo: Boolean(tienda.acepta_efectivo),
      sinpe: Boolean(tienda.acepta_sinpe),
      tarjeta: Boolean(tienda.acepta_tarjeta),
    },
    monedaCodigo: tienda.moneda_codigo,
    simboloMoneda: tienda.simbolo_moneda,
    actualizado: tienda.actualizado,
  };
}

function mapTiendaToDb(tienda) {
  return {
    nombre_comercial: tienda.nombreComercial,
    nombre_titular: tienda.nombreTitular,
    tipo_titular: tienda.tipoTitular,
    tipo_identificacion: tienda.tipoIdentificacion,
    numero_identificacion: tienda.numeroIdentificacion,
    actividad_economica: tienda.actividadEconomica,
    regimen_tributario: tienda.regimenTributario,
    telefono: tienda.telefono,
    correo: tienda.correo,
    pais: tienda.pais,
    provincia: tienda.provincia,
    canton: tienda.canton,
    distrito: tienda.distrito,
    direccion: tienda.direccion,
    ubicacion_referencia: tienda.ubicacionReferencia,
    acepta_efectivo: tienda.metodosPago.efectivo,
    acepta_sinpe: tienda.metodosPago.sinpe,
    acepta_tarjeta: tienda.metodosPago.tarjeta,
    moneda_codigo: tienda.monedaCodigo,
    simbolo_moneda: tienda.simboloMoneda,
  };
}

export const tiendaService = {
  get: async () => {
    const result = await window.api.tienda.get();
    if (!result.ok) throw new Error(result.message);
    return normalizeTienda(result.data);
  },

  update: async (tienda) => {
    const result = await window.api.tienda.update(mapTiendaToDb(tienda));
    if (!result.ok) throw new Error(result.message);
    return normalizeTienda(result.data);
  },
};
