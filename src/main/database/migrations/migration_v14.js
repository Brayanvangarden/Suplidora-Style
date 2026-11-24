function columnExists(db, column) {
  return db
    .prepare("PRAGMA table_info(clientes)")
    .all()
    .some((item) => item.name === column);
}

function up(db) {
  const additions = [
    [
      "tipo_cliente",
      "TEXT NOT NULL DEFAULT 'otro' CHECK(tipo_cliente IN ('persona_fisica', 'persona_juridica', 'extranjero', 'otro'))",
    ],
    [
      "tipo_identificacion",
      "TEXT NOT NULL DEFAULT 'otro' CHECK(tipo_identificacion IN ('cedula_fisica', 'cedula_juridica', 'dimex', 'nite', 'otro'))",
    ],
    ["numero_identificacion", "TEXT NOT NULL DEFAULT ''"],
    ["telefono_secundario", "TEXT NOT NULL DEFAULT ''"],
    ["correo_facturacion", "TEXT NOT NULL DEFAULT ''"],
    ["persona_contacto", "TEXT NOT NULL DEFAULT ''"],
    ["provincia", "TEXT NOT NULL DEFAULT ''"],
    ["canton", "TEXT NOT NULL DEFAULT ''"],
    ["distrito", "TEXT NOT NULL DEFAULT ''"],
    ["barrio", "TEXT NOT NULL DEFAULT ''"],
    ["codigo_postal", "TEXT NOT NULL DEFAULT ''"],
    ["actividad_economica", "TEXT NOT NULL DEFAULT ''"],
    ["codigo_actividad_economica", "TEXT NOT NULL DEFAULT ''"],
    [
      "requiere_factura_electronica",
      "INTEGER NOT NULL DEFAULT 0 CHECK(requiere_factura_electronica IN (0, 1))",
    ],
  ];

  const migrate = db.transaction(() => {
    for (const [name, definition] of additions) {
      if (!columnExists(db, name)) {
        db.exec(`ALTER TABLE clientes ADD COLUMN ${name} ${definition}`);
      }
    }

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_identificacion_unica
        ON clientes(tipo_identificacion, upper(trim(numero_identificacion)))
        WHERE trim(numero_identificacion) <> ''
    `);
  });

  migrate();
}

function down() {}

module.exports = { up, down };
