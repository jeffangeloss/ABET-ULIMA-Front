import { useState, type FormEvent } from "react";
import { AvisoSesion } from "./AvisoSesion";
import { Mensaje } from "../componentes/Mensaje";
import { RotuloPiloto } from "../componentes/RotuloPiloto";
import { Titulo } from "../componentes/Titulo";
import { boton, campo } from "../componentes/estilos";
import { ErrorApi, iniciarSesion } from "../servicios/api";
import type { Usuario } from "../servicios/tipos";

interface Props {
  alIngresar: (usuario: Usuario) => void;
  /** Texto de la API cuando la sesión venció, por ejemplo «La sesión venció. Ingrese otra vez.». */
  aviso?: string;
}

/** P1. El correo y la contraseña viven solo en el estado del formulario, nunca en el navegador. */
export function Ingreso({ alIngresar, aviso }: Props) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      alIngresar(await iniciarSesion(correo, contrasena));
    } catch (falla) {
      setError(falla instanceof ErrorApi ? falla.detail : "El servicio no respondió. Intente de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Titulo>Ingreso</Titulo>
      <RotuloPiloto />
      <AvisoSesion texto={aviso} />
      <form onSubmit={enviar} className="max-w-sm space-y-4">
        <div>
          <label htmlFor="correo" className="text-sm font-medium">Correo</label>
          <input id="correo" type="email" autoComplete="username" required value={correo}
            onChange={(e) => setCorreo(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="contrasena" className="text-sm font-medium">Contraseña</label>
          <input id="contrasena" type="password" autoComplete="current-password" required value={contrasena}
            onChange={(e) => setContrasena(e.target.value)} className={campo} />
        </div>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <button type="submit" disabled={enviando} className={boton}>
          {enviando ? "Ingresando" : "Ingresar"}
        </button>
      </form>
    </>
  );
}
