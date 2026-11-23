// Rótulos por cuenta (US-63 de la spec 007 del Back) y por alcance (US-71 de la spec 008). Los textos del profesor no
// cambian, porque los citan los .feature de las specs 001 y 004, los de la coordinación de la carrera hablan de la carrera
// y los de la coordinación del curso, del curso (propuestas). El alcance sale de alcance.tipo de la ruta 2 (contrato,
// sección 15.3), sin cambiar el tipo Rol, y una sesión sin ese campo conserva los rótulos de su rol.
import type { Usuario } from "./tipos";

type Cuenta = "PROFESOR" | "CARRERA" | "CURSO";

function cuentaDe(usuario: Usuario): Cuenta {
  if (usuario.rol !== "COORDINADOR") return "PROFESOR";
  return usuario.alcance?.tipo === "CURSO" ? "CURSO" : "CARRERA";
}

function segun(usuario: Usuario, textos: Record<Cuenta, string>): string {
  return textos[cuentaDe(usuario)];
}

/** Botón de la cabecera y título de P2. */
export function rotuloDeSecciones(usuario: Usuario): string {
  return segun(usuario, { PROFESOR: "Mis secciones", CARRERA: "Secciones de la carrera", CURSO: "Secciones del curso" });
}

/** Enlace a P6, que no se parece a «Ver resultado», el de P4 (spec 004, AD-11). */
export function rotuloDeLogros(usuario: Usuario): string {
  return segun(usuario, {
    PROFESOR: "Ver mis logros por SO",
    CARRERA: "Ver los logros por SO de la carrera",
    CURSO: "Ver los logros por SO del curso",
  });
}

/** Título de P6. */
export function tituloDeLogros(usuario: Usuario): string {
  return segun(usuario, {
    PROFESOR: "Mis logros por SO",
    CARRERA: "Logros por SO de la carrera",
    CURSO: "Logros por SO del curso",
  });
}

/** Lista vacía de P2, P5 y P6. */
export function sinSecciones(usuario: Usuario): string {
  return segun(usuario, {
    PROFESOR: "No tiene secciones asignadas en este periodo.",
    CARRERA: "La carrera no tiene secciones en este periodo.",
    CURSO: "El curso no tiene secciones en este periodo.",
  });
}

/** Aviso de espera de P6. */
export function esperaDeLogros(usuario: Usuario): string {
  return segun(usuario, {
    PROFESOR: "Cargando sus logros…",
    CARRERA: "Cargando los logros de la carrera…",
    CURSO: "Cargando los logros del curso…",
  });
}
