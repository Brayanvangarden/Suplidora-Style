const bcrypt = require("bcryptjs");
const { getDb } = require("../db");

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function validarComisionPorcentaje(value) {
  const porcentaje = Number(value ?? 0);
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    throw new Error("La comisión debe estar entre 0 y 100.");
  }
  return porcentaje;
}

function getAll() {
  return getDb()
    .prepare(
      `
      SELECT id, nombre, usuario, rol, comision_porcentaje, estado, creado_en
      FROM usuarios
      ORDER BY nombre ASC
    `,
    )
    .all();
}

function getById(id) {
  return getDb()
    .prepare(
      `
      SELECT id, nombre, usuario, rol, comision_porcentaje, estado, creado_en
      FROM usuarios WHERE id = ?
    `,
    )
    .get(id);
}

function create(data) {
  const comision_porcentaje = validarComisionPorcentaje(
    data.comision_porcentaje,
  );
  const result = getDb()
    .prepare(
      `
      INSERT INTO usuarios (
        nombre, usuario, password, rol, comision_porcentaje, estado
      )
      VALUES (
        @nombre, @usuario, @password, @rol, @comision_porcentaje, @estado
      )
    `,
    )
    .run({
      nombre: data.nombre,
      usuario: data.usuario,
      password: hashPassword(data.password),
      rol: data.rol ?? "vendedor",
      comision_porcentaje,
      estado: data.estado ?? "activo",
    });
  return getById(result.lastInsertRowid);
}

function update(id, data) {
  const comision_porcentaje = validarComisionPorcentaje(
    data.comision_porcentaje,
  );
  getDb()
    .prepare(
      `
      UPDATE usuarios SET
        nombre      = @nombre,
        usuario     = @usuario,
        rol         = @rol,
        comision_porcentaje = @comision_porcentaje,
        estado      = @estado,
        actualizado = datetime('now')
      WHERE id = @id
    `,
    )
    .run({ ...data, comision_porcentaje, id });
  return getById(id);
}

function updatePassword(id, newPassword) {
  const hash = hashPassword(newPassword);
  return getDb()
    .prepare(
      `
      UPDATE usuarios
      SET password    = ?,
          actualizado = datetime('now')
      WHERE id = ?
    `,
    )
    .run(hash, id);
}

function toggleEstado(id) {
  const usuario = getById(id);
  if (!usuario) throw new Error("Usuario no encontrado");

  const nuevoEstado = usuario.estado === "activo" ? "inactivo" : "activo";

  getDb()
    .prepare(
      `UPDATE usuarios SET estado = ?, actualizado = datetime('now') WHERE id = ?`,
    )
    .run(nuevoEstado, id);

  return getById(id);
}

function remove(id) {
  const usuario = getById(id);
  if (!usuario) throw new Error("Usuario no encontrado");

  if (usuario.rol === "admin") {
    const administradores = getDb()
      .prepare("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'")
      .get().total;
    if (administradores <= 1) {
      throw new Error("No se puede eliminar el último administrador");
    }
  }

  getDb().prepare("DELETE FROM usuarios WHERE id = ?").run(id);
}

function existeUsuario(usuario, excludeId = null) {
  const query = excludeId
    ? "SELECT id FROM usuarios WHERE usuario = ? AND id != ?"
    : "SELECT id FROM usuarios WHERE usuario = ?";

  const params = excludeId ? [usuario, excludeId] : [usuario];
  return !!getDb()
    .prepare(query)
    .get(...params);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  updatePassword,
  toggleEstado,
  remove,
  existeUsuario,
};
