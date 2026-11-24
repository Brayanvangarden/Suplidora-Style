const { getDb } = require("../db");

function getAll(includeInactive = true) {
  const db = getDb();
  return includeInactive
    ? db.prepare("SELECT * FROM proveedores ORDER BY nombre COLLATE NOCASE").all()
    : db.prepare("SELECT * FROM proveedores WHERE estado = 'activo' ORDER BY nombre COLLATE NOCASE").all();
}

function getById(id) {
  return getDb().prepare("SELECT * FROM proveedores WHERE id = ?").get(id);
}

function assertUniqueIdentification(data, excludeId) {
  if (!data.numero_identificacion?.trim()) return;
  const duplicate = getDb().prepare(`SELECT id FROM proveedores
    WHERE tipo_identificacion = @tipo_identificacion
    AND upper(trim(numero_identificacion)) = upper(trim(@numero_identificacion))
    AND id <> COALESCE(@exclude_id, -1) LIMIT 1`).get({
    tipo_identificacion: data.tipo_identificacion,
    numero_identificacion: data.numero_identificacion,
    exclude_id: excludeId ?? null,
  });
  if (duplicate) throw new Error("Ya existe un proveedor con ese tipo y número de identificación");
}

function save(id, data) {
  const db = getDb();
  assertUniqueIdentification(data, id);
  const fields = ["tipo_proveedor", "tipo_identificacion", "numero_identificacion", "nombre", "nombre_comercial", "persona_contacto", "telefono", "telefono_secundario", "correo", "correo_pedidos", "sitio_web", "provincia", "canton", "distrito", "barrio", "direccion", "condiciones_pago", "dias_credito", "notas", "estado"];
  const values = Object.fromEntries(fields.map((field) => [field, data[field] ?? (field === "dias_credito" ? null : "")]));
  if (id) {
    db.prepare(`UPDATE proveedores SET ${fields.map((field) => `${field} = @${field}`).join(", ")}, actualizado = datetime('now') WHERE id = @id`).run({ ...values, id });
    return getById(id);
  }
  const result = db.prepare(`INSERT INTO proveedores (${fields.join(", ")}) VALUES (${fields.map((field) => `@${field}`).join(", ")})`).run(values);
  return getById(result.lastInsertRowid);
}

function toggleEstado(id, estado) {
  getDb().prepare("UPDATE proveedores SET estado = ?, actualizado = datetime('now') WHERE id = ?").run(estado, id);
  return getById(id);
}

module.exports = { getAll, getById, create: (data) => save(null, data), update: (id, data) => save(id, data), toggleEstado };
