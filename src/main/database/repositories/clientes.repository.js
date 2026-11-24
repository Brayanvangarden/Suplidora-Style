const { getDb } = require("../db");

function getAll(includeInactive = false) {
  if (includeInactive) {
    return getDb().prepare(`SELECT * FROM clientes ORDER BY nombre ASC`).all();
  }
  return getDb()
    .prepare(
      `SELECT * FROM clientes WHERE estado = 'activo' ORDER BY nombre ASC`,
    )
    .all();
}

function getById(id) {
  return getDb().prepare("SELECT * FROM clientes WHERE id = ?").get(id);
}

function assertUniqueIdentification(data, excludeId) {
  if (!data.numero_identificacion?.trim()) return;

  const duplicate = getDb()
    .prepare(
      `SELECT id FROM clientes
       WHERE tipo_identificacion = @tipo_identificacion
         AND upper(trim(numero_identificacion)) = upper(trim(@numero_identificacion))
         AND id <> COALESCE(@exclude_id, -1)
       LIMIT 1`,
    )
    .get(
      {
        tipo_identificacion: data.tipo_identificacion,
        numero_identificacion: data.numero_identificacion,
        exclude_id: excludeId ?? null,
      },
    );

  if (duplicate) {
    throw new Error("Ya existe un cliente con ese tipo y número de identificación");
  }
}

function create(data) {
  assertUniqueIdentification(data);
  const result = getDb().prepare(`
    INSERT INTO clientes (
      empresa, nombre, tipo_cliente, tipo_identificacion, numero_identificacion,
      telefono, telefono_secundario, correo, correo_facturacion, persona_contacto,
      direccion, provincia, canton, distrito, barrio, codigo_postal,
      actividad_economica, codigo_actividad_economica, requiere_factura_electronica,
      notas, balance_pendiente, tiene_descuento, descuento_porcentaje, estado
    )
    VALUES (
      @empresa, @nombre, @tipo_cliente, @tipo_identificacion, @numero_identificacion,
      @telefono, @telefono_secundario, @correo, @correo_facturacion, @persona_contacto,
      @direccion, @provincia, @canton, @distrito, @barrio, @codigo_postal,
      @actividad_economica, @codigo_actividad_economica, @requiere_factura_electronica,
      @notas, @balance_pendiente, @tiene_descuento, @descuento_porcentaje, @estado
    )
  `).run({
    empresa: data.empresa ?? '',
    nombre: data.nombre,
    tipo_cliente: data.tipo_cliente ?? "otro",
    tipo_identificacion: data.tipo_identificacion ?? "otro",
    numero_identificacion: data.numero_identificacion ?? "",
    telefono: data.telefono ?? '',
    telefono_secundario: data.telefono_secundario ?? "",
    correo: data.correo ?? '',
    correo_facturacion: data.correo_facturacion ?? "",
    persona_contacto: data.persona_contacto ?? "",
    direccion: data.direccion ?? '',
    provincia: data.provincia ?? "",
    canton: data.canton ?? "",
    distrito: data.distrito ?? "",
    barrio: data.barrio ?? "",
    codigo_postal: data.codigo_postal ?? "",
    actividad_economica: data.actividad_economica ?? "",
    codigo_actividad_economica: data.codigo_actividad_economica ?? "",
    requiere_factura_electronica: data.requiere_factura_electronica ? 1 : 0,
    notas: data.notas ?? null,
    balance_pendiente: Number(data.balance_pendiente ?? 0),
    tiene_descuento: data.tiene_descuento ? 1 : 0,
    descuento_porcentaje: Number(data.descuento_porcentaje ?? 0),
    estado: data.estado ?? "activo",
  })
  return getById(result.lastInsertRowid)
}

function update(id, data) {
  assertUniqueIdentification(data, id);
  getDb()
    .prepare(
      `
    UPDATE clientes SET
      empresa    = @empresa,
      nombre     = @nombre,
      tipo_cliente = @tipo_cliente,
      tipo_identificacion = @tipo_identificacion,
      numero_identificacion = @numero_identificacion,
      telefono   = @telefono,
      telefono_secundario = @telefono_secundario,
      correo     = @correo,
      correo_facturacion = @correo_facturacion,
      persona_contacto = @persona_contacto,
      direccion  = @direccion,
      provincia = @provincia,
      canton = @canton,
      distrito = @distrito,
      barrio = @barrio,
      codigo_postal = @codigo_postal,
      actividad_economica = @actividad_economica,
      codigo_actividad_economica = @codigo_actividad_economica,
      requiere_factura_electronica = @requiere_factura_electronica,
      notas      = @notas,
      tiene_descuento = @tiene_descuento,
      descuento_porcentaje = @descuento_porcentaje,
      estado = @estado,
      actualizado = datetime('now')
    WHERE id = @id
  `,
    )
    .run({
      empresa: data.empresa ?? '',
      nombre: data.nombre,
      tipo_cliente: data.tipo_cliente ?? "otro",
      tipo_identificacion: data.tipo_identificacion ?? "otro",
      numero_identificacion: data.numero_identificacion ?? "",
      telefono: data.telefono ?? '',
      telefono_secundario: data.telefono_secundario ?? "",
      correo: data.correo ?? '',
      correo_facturacion: data.correo_facturacion ?? "",
      persona_contacto: data.persona_contacto ?? "",
      direccion: data.direccion ?? '',
      provincia: data.provincia ?? "",
      canton: data.canton ?? "",
      distrito: data.distrito ?? "",
      barrio: data.barrio ?? "",
      codigo_postal: data.codigo_postal ?? "",
      actividad_economica: data.actividad_economica ?? "",
      codigo_actividad_economica: data.codigo_actividad_economica ?? "",
      requiere_factura_electronica: data.requiere_factura_electronica ? 1 : 0,
      notas: data.notas ?? null,
      tiene_descuento: data.tiene_descuento ? 1 : 0,
      descuento_porcentaje: Number(data.descuento_porcentaje ?? 0),
      estado: data.estado ?? "activo",
      id,
    });
  return getById(id);
}

function remove(id) {
  const db = getDb();
  const cliente = db
    .prepare("SELECT id, estado FROM clientes WHERE id = ?")
    .get(id);

  if (!cliente) {
    return null;
  }

  if (cliente.estado === "inactivo") {
    return cliente;
  }

  db.prepare(
    `
    UPDATE clientes
    SET estado = 'inactivo', actualizado = datetime('now')
    WHERE id = ?
  `,
  ).run(id);

  return db.prepare("SELECT * FROM clientes WHERE id = ?").get(id);
}

function updateBalance(id, monto) {
  return getDb()
    .prepare(
      `
      UPDATE clientes
      SET balance_pendiente = balance_pendiente + ?,
          actualizado = datetime('now')
      WHERE id = ?
    `,
    )
    .run(monto, id);
}

module.exports = { getAll, getById, create, update, remove, updateBalance };
