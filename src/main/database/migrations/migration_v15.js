function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_proveedor TEXT NOT NULL DEFAULT 'otro' CHECK(tipo_proveedor IN ('persona_fisica','persona_juridica','extranjero','otro')),
      tipo_identificacion TEXT NOT NULL DEFAULT 'otro' CHECK(tipo_identificacion IN ('cedula_fisica','cedula_juridica','dimex','nite','otro')),
      numero_identificacion TEXT NOT NULL DEFAULT '',
      nombre TEXT NOT NULL,
      nombre_comercial TEXT NOT NULL DEFAULT '',
      persona_contacto TEXT NOT NULL DEFAULT '',
      telefono TEXT NOT NULL DEFAULT '',
      telefono_secundario TEXT NOT NULL DEFAULT '',
      correo TEXT NOT NULL DEFAULT '',
      correo_pedidos TEXT NOT NULL DEFAULT '',
      sitio_web TEXT NOT NULL DEFAULT '',
      provincia TEXT NOT NULL DEFAULT '',
      canton TEXT NOT NULL DEFAULT '',
      distrito TEXT NOT NULL DEFAULT '',
      barrio TEXT NOT NULL DEFAULT '',
      direccion TEXT NOT NULL DEFAULT '',
      condiciones_pago TEXT NOT NULL DEFAULT '',
      dias_credito INTEGER,
      notas TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo','inactivo')),
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_identificacion_unica
      ON proveedores(tipo_identificacion, upper(trim(numero_identificacion)))
      WHERE trim(numero_identificacion) <> '';
    CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);
    CREATE INDEX IF NOT EXISTS idx_proveedores_estado ON proveedores(estado);
  `);
}

function down() {}

module.exports = { up, down };
