function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tienda_configuracion (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      nombre_comercial TEXT NOT NULL,
      nombre_titular TEXT NOT NULL,
      tipo_titular TEXT NOT NULL,
      tipo_identificacion TEXT NOT NULL,
      numero_identificacion TEXT NOT NULL,
      actividad_economica TEXT NOT NULL,
      regimen_tributario TEXT NOT NULL,
      telefono TEXT NOT NULL,
      correo TEXT NOT NULL,
      pais TEXT NOT NULL,
      provincia TEXT NOT NULL,
      canton TEXT NOT NULL,
      distrito TEXT NOT NULL DEFAULT '',
      direccion TEXT NOT NULL,
      ubicacion_referencia TEXT NOT NULL DEFAULT '',
      acepta_efectivo INTEGER NOT NULL DEFAULT 1 CHECK(acepta_efectivo IN (0, 1)),
      acepta_sinpe INTEGER NOT NULL DEFAULT 1 CHECK(acepta_sinpe IN (0, 1)),
      acepta_tarjeta INTEGER NOT NULL DEFAULT 1 CHECK(acepta_tarjeta IN (0, 1)),
      moneda_codigo TEXT NOT NULL DEFAULT 'CRC' CHECK(moneda_codigo = 'CRC'),
      simbolo_moneda TEXT NOT NULL DEFAULT '₡' CHECK(simbolo_moneda = '₡'),
      actualizado TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO tienda_configuracion (
      id, nombre_comercial, nombre_titular, tipo_titular,
      tipo_identificacion, numero_identificacion, actividad_economica,
      regimen_tributario, telefono, correo, pais, provincia, canton,
      distrito, direccion, ubicacion_referencia
    ) VALUES (
      1, 'Suplidora Style', 'Jeilen Miranda Valverde', 'Persona física',
      'Cédula física', '2-0583-0656', '4649.2', 'Régimen tradicional',
      '6074-4198', 'jeilenmv@hotmail.com', 'Costa Rica', 'Alajuela',
      'Alajuela', '', '100 metros norte de la Pops del Parque Central de Alajuela',
      'Alajuela Centro'
    );
  `);
}

function down() {}

module.exports = { up, down };
