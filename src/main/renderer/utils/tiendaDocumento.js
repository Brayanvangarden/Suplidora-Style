export function getTiendaLineasDocumento(tienda) {
  const direccion = [
    tienda.direccion,
    tienda.ubicacionReferencia,
    tienda.distrito,
    tienda.canton,
    tienda.provincia,
    tienda.pais,
  ]
    .map((parte) => String(parte ?? "").trim())
    .filter(Boolean)
    .join(", ");

  return [
    tienda.nombreComercial,
    tienda.nombreTitular
      ? `Titular: ${tienda.nombreTitular}${tienda.tipoTitular ? ` (${tienda.tipoTitular})` : ""}`
      : "",
    tienda.numeroIdentificacion
      ? `${tienda.tipoIdentificacion}: ${tienda.numeroIdentificacion}`
      : "",
    tienda.actividadEconomica
      ? `Actividad económica: ${tienda.actividadEconomica}`
      : "",
    tienda.regimenTributario
      ? `Régimen tributario: ${tienda.regimenTributario}`
      : "",
    tienda.telefono ? `Teléfono: ${tienda.telefono}` : "",
    tienda.correo ? `Correo: ${tienda.correo}` : "",
    direccion ? `Dirección: ${direccion}` : "",
  ].filter(Boolean);
}
