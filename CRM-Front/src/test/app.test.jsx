import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Ingresar } from "../pages/Acceso.jsx";
import { cop, haceCuanto, enlaceWhatsApp } from "../lib/formato.js";
import { nivelRiesgo } from "../lib/significados.js";

describe("Pantalla de ingreso", () => {
  it("muestra los campos y el botón", () => {
    render(<MemoryRouter><Ingresar /></MemoryRouter>);
    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
  });
});

describe("Formatos y significados", () => {
  it("formatea pesos colombianos", () => {
    expect(cop(45000).replace(/\s/g, " ")).toMatch(/45\.000/);
  });
  it("clasifica el riesgo con los umbrales del modelo", () => {
    expect(nivelRiesgo(null)).toBe("ninguno");
    expect(nivelRiesgo(0.2)).toBe("bajo");
    expect(nivelRiesgo(0.55)).toBe("medio");
    expect(nivelRiesgo(0.9)).toBe("alto");
  });
  it("arma el enlace de WhatsApp con el indicativo de Colombia", () => {
    expect(enlaceWhatsApp("300 123 4567", "Hola")).toBe("https://wa.me/573001234567?text=Hola");
  });
  it("describe hace cuánto fue una fecha", () => {
    expect(haceCuanto(null)).toBe("Nunca");
    expect(haceCuanto(new Date().toISOString())).toBe("Hoy");
  });
});
