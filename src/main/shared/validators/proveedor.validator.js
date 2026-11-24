const { z } = require("zod");

const telefono = z.string().trim().max(30, "El teléfono no puede superar 30 caracteres").refine((v) => !v || (/^[+\d().\-\s]+$/.test(v) && v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15), "El teléfono debe tener entre 7 y 15 dígitos");
const correo = z.string().trim().max(254).refine((v) => !v || z.string().email().safeParse(v).success, "El correo no es válido");

const proveedorSchema = z.object({
  tipo_proveedor: z.enum(["persona_fisica", "persona_juridica", "extranjero", "otro"]).default("otro"),
  tipo_identificacion: z.enum(["cedula_fisica", "cedula_juridica", "dimex", "nite", "otro"]).default("otro"),
  numero_identificacion: z.string().trim().max(40).default(""),
  nombre: z.string().trim().min(1, "El nombre o razón social es obligatorio").max(200),
  nombre_comercial: z.string().trim().max(200).default(""),
  persona_contacto: z.string().trim().max(200).default(""),
  telefono: telefono.default(""), telefono_secundario: telefono.default(""),
  correo: correo.default(""), correo_pedidos: correo.default(""),
  sitio_web: z.string().trim().max(300).default(""),
  provincia: z.string().trim().max(100).default(""), canton: z.string().trim().max(100).default(""), distrito: z.string().trim().max(100).default(""), barrio: z.string().trim().max(100).default(""), direccion: z.string().trim().max(500).default(""),
  condiciones_pago: z.string().trim().max(200).default(""),
  dias_credito: z.union([z.literal(""), z.null()]).transform(() => null).or(z.coerce.number().int().min(0, "Los días de crédito no pueden ser negativos").max(3650, "Los días de crédito no pueden superar 3650")).default(null),
  notas: z.string().trim().max(2000).default(""), estado: z.enum(["activo", "inactivo"]).default("activo"),
});

function validarProveedor(data) {
  const result = proveedorSchema.safeParse(data);
  if (!result.success) return { ok: false, message: result.error.issues[0]?.message ?? "Datos inválidos" };
  return { ok: true, data: result.data };
}

module.exports = { proveedorSchema, validarProveedor };
