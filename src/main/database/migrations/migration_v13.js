function columnExists(db, table, column) {
  return db
    .prepare(`PRAGMA table_info("${table}")`)
    .all()
    .some((item) => item.name === column);
}

function up(db) {
  if (!columnExists(db, "usuarios", "comision_porcentaje")) {
    db.exec(
      "ALTER TABLE usuarios ADD COLUMN comision_porcentaje REAL NOT NULL DEFAULT 0",
    );
  }

  if (!columnExists(db, "ordenes", "vendedor_id")) {
    db.exec(
      "ALTER TABLE ordenes ADD COLUMN vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL",
    );
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS comisiones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_id        INTEGER NOT NULL UNIQUE REFERENCES ordenes(id) ON DELETE RESTRICT,
      factura_id      INTEGER NOT NULL UNIQUE REFERENCES facturas(id) ON DELETE RESTRICT,
      vendedor_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
      base            REAL    NOT NULL CHECK(base >= 0),
      porcentaje      REAL    NOT NULL CHECK(porcentaje BETWEEN 0 AND 100),
      monto           REAL    NOT NULL CHECK(monto >= 0),
      fecha_creacion  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ordenes_vendedor ON ordenes(vendedor_id);
    CREATE INDEX IF NOT EXISTS idx_comisiones_vendedor ON comisiones(vendedor_id);

    CREATE TABLE IF NOT EXISTS pagos_comisiones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      vendedor_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
      monto           REAL    NOT NULL CHECK(monto > 0),
      metodo_pago     TEXT    NOT NULL
                        CHECK(metodo_pago IN ('efectivo','datafono','sinpe_movil')),
      fecha_pago      TEXT    NOT NULL DEFAULT (datetime('now')),
      notas           TEXT,
      admin_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_pagos_comisiones_vendedor
      ON pagos_comisiones(vendedor_id, fecha_pago);
  `);
}

function down() {}

module.exports = { up, down };
