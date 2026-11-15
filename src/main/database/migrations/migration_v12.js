function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function up(db) {
  const table = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'pagos'",
    )
    .get();
  if (!table?.sql) {
    throw new Error("No se encontró la tabla pagos para actualizar métodos");
  }

  const hasSinpeMovil = table.sql.includes("'sinpe_movil'");
  const hasZelle = table.sql.includes("'zelle'");
  if (!hasSinpeMovil && !hasZelle) {
    throw new Error("No se pudo identificar la restricción de métodos de pago");
  }

  if (hasZelle && !hasSinpeMovil) {
    const updatedSql = table.sql.replace(/'zelle'/g, "'sinpe_movil'");
    const createPattern =
      /^(CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?)(?:"pagos"|\[pagos\]|`pagos`|pagos)(\s*\()/i;
    const temporarySql = updatedSql.replace(
      createPattern,
      '$1"__migration_v12_pagos"$2',
    );
    if (temporarySql === updatedSql) {
      throw new Error("No se pudo preparar la tabla pagos para la migración");
    }

    const columns = db
      .prepare("PRAGMA table_info(pagos)")
      .all()
      .map((column) => quoteIdentifier(column.name));
    const columnList = columns.join(", ");
    const selectColumnList = columns
      .map((column) =>
        column === '"metodo_pago"'
          ? `CASE
              WHEN ${column} IN ('zelle', 'sinpe') THEN 'sinpe_movil'
              ELSE ${column}
            END AS ${column}`
          : column,
      )
      .join(", ");
    const relatedObjects = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE tbl_name = 'pagos' AND type IN ('index', 'trigger') AND sql IS NOT NULL",
      )
      .all();
    const previousSequence = db
      .prepare("SELECT seq FROM sqlite_sequence WHERE name = 'pagos'")
      .get()?.seq;
    const rowCount = db
      .prepare("SELECT COUNT(*) AS total FROM pagos")
      .get().total;

    db.pragma("foreign_keys = OFF");
    try {
      db.transaction(() => {
        db.exec(temporarySql);
        db.exec(`
          INSERT INTO "__migration_v12_pagos" (${columnList})
          SELECT ${selectColumnList} FROM pagos
        `);
        db.exec('DROP TABLE "pagos"');
        db.exec('ALTER TABLE "__migration_v12_pagos" RENAME TO "pagos"');

        if (previousSequence !== undefined) {
          const currentSequence = db
            .prepare("SELECT seq FROM sqlite_sequence WHERE name = 'pagos'")
            .get();
          if (currentSequence) {
            db.prepare(
              "UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'pagos'",
            ).run(previousSequence);
          } else {
            db.prepare(
              "INSERT INTO sqlite_sequence (name, seq) VALUES ('pagos', ?)",
            ).run(previousSequence);
          }
        }

        for (const object of relatedObjects) {
          db.exec(object.sql);
        }

        const migratedCount = db
          .prepare("SELECT COUNT(*) AS total FROM pagos")
          .get().total;
        if (migratedCount !== rowCount) {
          throw new Error("La migración no conservó todos los pagos");
        }
      })();
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }

  db.exec(`
    UPDATE pagos
    SET metodo_pago = 'sinpe_movil'
    WHERE metodo_pago IN ('zelle', 'sinpe')
  `);
  db.exec(`
    UPDATE facturas
    SET metodo_pago = 'sinpe_movil'
    WHERE metodo_pago IN ('zelle', 'sinpe')
  `);
}

function down() {}

module.exports = { up, down };
