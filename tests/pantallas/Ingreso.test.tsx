import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Ingreso } from "../../src/pantallas/Ingreso";
import { json, simularApi } from "../ayudas";
import { usuarioProfesor } from "../respuestas";

const ROTULO = "Solo exports con códigos inventados (99000000 a 99999999)";

async function llenar(correo = "docente410@example.invalid", clave = "clave-de-prueba") {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Correo"), correo);
  await u.type(screen.getByLabelText("Contraseña"), clave);
  return u;
}

describe("P1 Ingreso", () => {
  it("muestra correo, contraseña oculta, el botón Ingresar y el rótulo del piloto", () => {
    render(<Ingreso alIngresar={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Ingreso" })).toHaveFocus();
    expect(screen.getByLabelText("Correo")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
    expect(screen.getByText(ROTULO)).toBeInTheDocument();
  });

  it("con credenciales válidas llama a alIngresar con el usuario de la API", async () => {
    simularApi({ "POST /api/sesion": json(200, usuarioProfesor) });
    const alIngresar = vi.fn();
    render(<Ingreso alIngresar={alIngresar} />);
    const u = await llenar();
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(alIngresar).toHaveBeenCalledWith(usuarioProfesor));
  });

  it("el 401 muestra el mensaje único y no deja nada de la sesión en el navegador", async () => {
    simularApi({ "POST /api/sesion": json(401, { detail: "Correo o contraseña incorrectos." }) });
    const alIngresar = vi.fn();
    render(<Ingreso alIngresar={alIngresar} />);
    const u = await llenar();
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
    expect(alIngresar).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("el 429 muestra el detail del límite de intentos", async () => {
    simularApi({ "POST /api/sesion": json(429, { detail: "Demasiados intentos. Espere 15 minutos." }) });
    render(<Ingreso alIngresar={vi.fn()} />);
    const u = await llenar();
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Demasiados intentos. Espere 15 minutos.");
  });

  it("el botón queda desactivado mientras la API responde y solo sale una petición", async () => {
    let soltar: () => void = () => undefined;
    const espera = new Promise<void>((r) => (soltar = r));
    const { falso } = simularApi({
      "POST /api/sesion": async () => {
        await espera;
        return json(200, usuarioProfesor);
      },
    });
    render(<Ingreso alIngresar={vi.fn()} />);
    const u = await llenar();
    await u.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(screen.getByRole("button", { name: "Ingresando" })).toBeDisabled();
    expect(falso).toHaveBeenCalledTimes(1);
    soltar();
  });

  it("no ofrece registro, recuperación, Microsoft ni recordar el usuario", () => {
    render(<Ingreso alIngresar={vi.fn()} />);
    expect(screen.queryByText(/regist|recuper|olvid|microsoft|recordar/i)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("muestra el aviso de sesión vencida cuando App lo manda", () => {
    render(<Ingreso alIngresar={vi.fn()} aviso="La sesión venció. Ingrese otra vez." />);
    expect(screen.getByRole("status")).toHaveTextContent("La sesión venció. Ingrese otra vez.");
  });
});
