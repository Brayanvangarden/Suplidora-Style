const { getDb } = require("../db");

function validarAcceso(solicitanteId, vendedorId = null, soloAdmin = false) {
  const db = getDb();
  const solicitante = db
    .prepare("SELECT id, rol FROM usuarios WHERE id = ?")
    .get(solicitanteId);
  if (!solicitante) throw new Error("No se encontró el usuario.");

  if (soloAdmin && solicitante.rol !== "admin") {
    throw new Error("Solo un administrador puede consultar los pagos.");
  }

  const vendedorDestino =
    vendedorId == null && solicitante.rol === "vendedor"
      ? solicitante.id
      : vendedorId;
  if (
    solicitante.rol !== "admin" &&
    Number(vendedorDestino) !== Number(solicitante.id)
  ) {
    throw new Error("Solo puedes consultar tu propia información.");
  }
  if (vendedorDestino != null) {
    const vendedor = db
      .prepare("SELECT id, rol FROM usuarios WHERE id = ?")
      .get(vendedorDestino);
    if (!vendedor || vendedor.rol !== "vendedor") {
      throw new Error("No se encontró el vendedor.");
    }
  }

  return { db, esAdmin: solicitante.rol === "admin", vendedorDestino };
}

function getResumen(solicitanteId, vendedorId = null) {
  const { db, esAdmin, vendedorDestino } = validarAcceso(
    solicitanteId,
    vendedorId,
  );
  const pagoSelect = esAdmin
    ? `COALESCE(p.total_pagado, 0) AS total_pagado,
       MAX(0, COALESCE(c.total_comisiones, 0) - COALESCE(p.total_pagado, 0)) AS saldo_por_pagar`
    : "NULL AS total_pagado, NULL AS saldo_por_pagar";
  const pagoJoin = esAdmin
    ? `
      LEFT JOIN (
        SELECT vendedor_id, SUM(monto) AS total_pagado
        FROM pagos_comisiones
        GROUP BY vendedor_id
      ) p ON p.vendedor_id = u.id
    `
    : "";
  let query = `
    SELECT
      u.id,
      u.nombre,
      u.usuario,
      u.estado,
      u.comision_porcentaje,
      COALESCE(c.ventas_facturadas, 0) AS ventas_facturadas,
      COALESCE(c.total_facturado, 0) AS total_facturado,
      COALESCE(c.total_comisiones, 0) AS total_comisiones,
      ${pagoSelect}
    FROM usuarios u
    LEFT JOIN (
      SELECT
        vendedor_id,
        COUNT(*) AS ventas_facturadas,
        SUM(base) AS total_facturado,
        SUM(monto) AS total_comisiones
      FROM comisiones
      GROUP BY vendedor_id
    ) c ON c.vendedor_id = u.id
    ${pagoJoin}
    WHERE u.rol = 'vendedor'
  `;
  const params = [];
  if (vendedorDestino != null) {
    query += " AND u.id = ?";
    params.push(vendedorDestino);
  }
  query += " ORDER BY u.nombre";
  return db.prepare(query).all(...params);
}

function getDetalle(solicitanteId, vendedorId) {
  const { db, vendedorDestino } = validarAcceso(
    solicitanteId,
    vendedorId,
  );
  if (vendedorDestino == null) {
    throw new Error("Selecciona un vendedor para consultar sus ventas.");
  }
  return db
    .prepare(
      `
      SELECT
        o.id AS orden_id,
        o.fecha_creacion,
        o.estado,
        o.estado_pago,
        o.total AS total_orden,
        c.nombre AS cliente_nombre,
        f.numero_factura,
        f.total AS total_facturado,
        co.base AS base_comision,
        co.porcentaje AS porcentaje_comision,
        co.monto AS comision,
        co.fecha_creacion AS fecha_comision
      FROM ordenes o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN facturas f ON f.orden_id = o.id
      LEFT JOIN comisiones co ON co.orden_id = o.id
      WHERE o.vendedor_id = ?
      ORDER BY o.fecha_creacion DESC, o.id DESC
    `,
    )
    .all(vendedorDestino);
}

function getPagos(solicitanteId, vendedorId) {
  const { db, vendedorDestino } = validarAcceso(
    solicitanteId,
    vendedorId,
    true,
  );
  if (vendedorDestino == null) {
    throw new Error("Selecciona un vendedor para consultar sus pagos.");
  }
  return db
    .prepare(
      `
      SELECT p.*, u.nombre AS admin_nombre
      FROM pagos_comisiones p
      LEFT JOIN usuarios u ON u.id = p.admin_id
      WHERE p.vendedor_id = ?
      ORDER BY p.fecha_pago DESC, p.id DESC
    `,
    )
    .all(vendedorDestino);
}

function registrarPago(data) {
  const { db, vendedorDestino } = validarAcceso(
    data.admin_id,
    data.vendedor_id,
    true,
  );
  const monto = Number(data.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto del pago debe ser mayor que cero.");
  }
  if (!["efectivo", "datafono", "sinpe_movil"].includes(data.metodo_pago)) {
    throw new Error("Selecciona un método de pago válido.");
  }

  const transaction = db.transaction(() => {
    const comisiones = db
      .prepare(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM comisiones WHERE vendedor_id = ?",
      )
      .get(vendedorDestino).total;
    const pagado = db
      .prepare(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM pagos_comisiones WHERE vendedor_id = ?",
      )
      .get(vendedorDestino).total;
    const saldo = Math.max(0, Number(comisiones) - Number(pagado));
    if (monto > saldo + 0.005) {
      throw new Error(
        `El pago excede las comisiones pendientes (${saldo.toFixed(2)}).`,
      );
    }

    const result = db
      .prepare(
        `
        INSERT INTO pagos_comisiones
          (vendedor_id, monto, metodo_pago, notas, admin_id)
        VALUES (?, ?, ?, ?, ?)
      `,
      )
      .run(
        vendedorDestino,
        monto,
        data.metodo_pago,
        data.notas?.trim() || null,
        data.admin_id,
      );
    return result.lastInsertRowid;
  });

  return db
    .prepare(
      `
      SELECT p.*, u.nombre AS admin_nombre
      FROM pagos_comisiones p
      LEFT JOIN usuarios u ON u.id = p.admin_id
      WHERE p.id = ?
    `,
    )
    .get(transaction());
}

module.exports = {
  getResumen,
  getDetalle,
  getPagos,
  registrarPago,
};
