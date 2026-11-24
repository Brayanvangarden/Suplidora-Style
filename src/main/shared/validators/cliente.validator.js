const { z } = require("zod");

const telefonoSchema = z
  .string()
  .trim()
  .max(30, "El teléfono no puede superar 30 caracteres")
  .refine(
    (value) => {
      if (!value) return true;
      if (!/^[+\d().\-\s]+$/.test(value)) return false;
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    },
    { message: "El teléfono debe tener entre 7 y 15 dígitos" },
  );

const correoSchema = z
  .string()
  .trim()
  .max(254, "El correo no puede superar 254 caracteres")
  .refine((value) => value === "" || z.string().email().safeParse(value).success, {
    message: "El correo no es válido",
  });

const booleanSchema = z.preprocess(
  (value) => {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === 0) return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "sí", "si"].includes(normalized)) return true;
      if (["false", "0", ""].includes(normalized)) return false;
    }
    return value;
  },
  z.boolean(),
);

const clienteSchema = z.object({
  empresa: z.string().trim().max(200).optional().default(""),

  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre o razón social es obligatorio")
    .max(200, "El nombre no puede superar 200 caracteres"),

  tipo_cliente: z
    .enum(["persona_fisica", "persona_juridica", "extranjero", "otro"])
    .optional()
    .default("otro"),

  tipo_identificacion: z
    .enum(["cedula_fisica", "cedula_juridica", "dimex", "nite", "otro"])
    .optional()
    .default("otro"),

  numero_identificacion: z
    .string()
    .trim()
    .max(40, "El número de identificación no puede superar 40 caracteres")
    .optional()
    .default(""),

  telefono: telefonoSchema.optional().default(""),
  telefono_secundario: telefonoSchema.optional().default(""),
  correo: correoSchema.optional().default(""),
  correo_facturacion: correoSchema.optional().default(""),
  persona_contacto: z.string().trim().max(200).optional().default(""),
  direccion: z.string().trim().max(500).optional().default(""),
  provincia: z.string().trim().max(100).optional().default(""),
  canton: z.string().trim().max(100).optional().default(""),
  distrito: z.string().trim().max(100).optional().default(""),
  barrio: z.string().trim().max(100).optional().default(""),
  codigo_postal: z.string().trim().max(20).optional().default(""),
  actividad_economica: z.string().trim().max(250).optional().default(""),
  codigo_actividad_economica: z
    .string()
    .trim()
    .max(40)
    .optional()
    .default(""),
  requiere_factura_electronica: booleanSchema.optional().default(false),
  notas: z.string().trim().max(2000).optional().default(""),
  tiene_descuento: booleanSchema.optional().default(false),
  descuento_porcentaje: z.coerce
    .number()
    .finite("El descuento debe ser un número válido")
    .min(0, "El descuento no puede ser negativo")
    .max(100, "El descuento no puede superar 100%")
    .optional()
    .default(0),
  estado: z.enum(["activo", "inactivo"]).optional().default("activo"),
});

const clienteImportSchema = clienteSchema.extend({
  balance_pendiente: z.coerce.number().optional().default(0),
});

function validarClienteImport(data) {
  const resultado = clienteImportSchema.safeParse(data);
  if (!resultado.success) {
    const primerError = resultado.error.issues[0];
    return { ok: false, message: primerError?.message ?? "Datos inválidos" };
  }
  return { ok: true, data: resultado.data };
}

function validarCliente(data) {
  const resultado = clienteSchema.safeParse(data);

  if (!resultado.success) {
    const primerError = resultado.error.issues[0];
    return { ok: false, message: primerError?.message ?? "Datos inválidos" };
  }

  return { ok: true, data: resultado.data };
}

module.exports = {
  clienteSchema,
  validarCliente,
  clienteImportSchema,
  validarClienteImport,
};
