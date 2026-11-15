function up(db) {
  const columns = db.prepare("PRAGMA table_info(ordenes)").all();
  if (columns.some((column) => column.name === "descuento_orden_porcentaje")) {
    return;
  }

  db.exec(
    "ALTER TABLE ordenes ADD COLUMN descuento_orden_porcentaje REAL NOT NULL DEFAULT 0",
  );
}

function down() {}

module.exports = { up, down };
