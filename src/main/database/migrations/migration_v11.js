function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function up(db) {
  const table = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'ordenes'",
    )
    .get();
  if (!table?.sql) {
    throw new Error(
      "No se encontró la tabla ordenes para actualizar sus estados",
    );
  }
  if (table.sql.includes("'procesada'")) return;

  const updatedSql = table.sql.replace(
    /CHECK\s*\(\s*estado\s+IN\s*\(\s*'pendiente'\s*,\s*'en_proceso'\s*,\s*'completada'\s*,\s*'cancelada'\s*\)\s*\)/i,
    "CHECK(estado IN ('pendiente','en_proceso','completada','procesada','cancelada'))",
  );
  if (updatedSql === table.sql) {
    throw new Error(
      "No se pudo actualizar la restricción de estados de ordenes",
    );
  }

  const createPattern =
    /^(CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?)(?:"ordenes"|\[ordenes\]|`ordenes`|ordenes)(\s*\()/i;
  const temporarySql = updatedSql.replace(
    createPattern,
    '$1"__migration_v11_ordenes"$2',
  );
  if (temporarySql === updatedSql) {
    throw new Error("No se pudo preparar la tabla ordenes para la migración");
  }

  const columns = db
    .prepare("PRAGMA table_info(ordenes)")
    .all()
    .map((column) => quoteIdentifier(column.name));
  const columnList = columns.join(", ");
  const relatedObjects = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE tbl_name = 'ordenes' AND type IN ('index', 'trigger') AND sql IS NOT NULL",
    )
    .all();
  const previousSequence = db
    .prepare("SELECT seq FROM sqlite_sequence WHERE name = 'ordenes'")
    .get()?.seq;
  const rowCount = db
    .prepare("SELECT COUNT(*) AS total FROM ordenes")
    .get().total;

  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      db.exec(temporarySql);
      db.exec(`
        INSERT INTO "__migration_v11_ordenes" (${columnList})
        SELECT ${columnList} FROM ordenes
      `);
      db.exec('DROP TABLE "ordenes"');
      db.exec(
        'ALTER TABLE "__migration_v11_ordenes" RENAME TO "ordenes"',
      );

      if (previousSequence !== undefined) {
        const currentSequence = db
          .prepare("SELECT seq FROM sqlite_sequence WHERE name = 'ordenes'")
          .get();
        if (currentSequence) {
          db.prepare(
            "UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'ordenes'",
          ).run(previousSequence);
        } else {
          db.prepare(
            "INSERT INTO sqlite_sequence (name, seq) VALUES ('ordenes', ?)",
          ).run(previousSequence);
        }
      }

      for (const object of relatedObjects) {
        db.exec(object.sql);
      }

      db.exec(`
        UPDATE ordenes
        SET estado = 'procesada'
        WHERE id IN (SELECT orden_id FROM facturas)
      `);

      const migratedCount = db
        .prepare("SELECT COUNT(*) AS total FROM ordenes")
        .get().total;
      if (migratedCount !== rowCount) {
        throw new Error("La migración no conservó todas las órdenes");
      }
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

function down() {}

module.exports = { up, down };
