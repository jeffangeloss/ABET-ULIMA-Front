// Spec 008, US-81 y FR-017. Razón de contraste de WCAG 2.2 (Web Content Accessibility Guidelines) entre dos colores
// hexadecimales, sin navegador, para que la prueba de contraste lea los tokens literales de src/index.css.

function canal(valor: number): number {
  const c = valor / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un color #rrggbb. */
function luminancia(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Color sin la forma #rrggbb: ${hex}`);
  const [r, g, b] = m.slice(1).map((h) => canal(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón entre 1 y 21, la misma en los dos órdenes. AA pide 4,5 en el texto normal y 3 en los componentes. */
export function razonDeContraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Los tokens --color-* del bloque @theme, por su nombre sin el prefijo. Fuera de @theme no cuenta ninguno. */
export function leerTokensDeColor(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const bloque of css.matchAll(/@theme\s*\{([^}]*)\}/g)) {
    for (const [, nombre, valor] of bloque[1].matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)) {
      tokens[nombre] = valor;
    }
  }
  return tokens;
}
