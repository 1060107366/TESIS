import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Save } from "lucide-react";
import { cuenta } from "../api/crm.js";
import { avisar, useSesion } from "../stores/sesion.js";
import { Bento, Encabezado, Mosaico } from "../components/ui/Mosaico.jsx";
import { Boton, Campo } from "../components/ui/Controles.jsx";
import { Cargando } from "../components/ui/Estados.jsx";

export default function MiCuenta() {
  const { usuario, cargarUsuario, actualizarUsuario, salir } = useSesion();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ usuario: "", email: "" });
  const [clave, setClave] = useState({ contrasena: "", confirmar: "" });
  const [error, setError] = useState({});
  const [guardando, setGuardando] = useState("");

  useEffect(() => {
    if (!usuario) cargarUsuario();
    else setDatos({ usuario: usuario.usuario, email: usuario.email });
  }, [usuario, cargarUsuario]);

  const guardarDatos = async (e) => {
    e.preventDefault();
    if (!datos.usuario.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim()))
      return setError({ datos: "Escriba el nombre de la tienda y un correo válido." });
    setGuardando("datos");
    setError({});
    try {
      const cambios = { usuario: datos.usuario.trim(), email: datos.email.trim().toLowerCase() };
      await cuenta.actualizar(cambios);
      actualizarUsuario(cambios);
      avisar("Datos de la tienda guardados.");
    } catch (err) {
      setError({ datos: err.message });
    } finally {
      setGuardando("");
    }
  };

  const cambiarClave = async (e) => {
    e.preventDefault();
    if (clave.contrasena.length < 6) return setError({ clave: "La contraseña debe tener al menos 6 caracteres." });
    if (clave.contrasena !== clave.confirmar) return setError({ clave: "Las dos contraseñas no coinciden." });
    setGuardando("clave");
    setError({});
    try {
      await cuenta.actualizar({ contrasena: clave.contrasena });
      setClave({ contrasena: "", confirmar: "" });
      avisar("Contraseña cambiada.");
    } catch (err) {
      setError({ clave: err.message });
    } finally {
      setGuardando("");
    }
  };

  if (!usuario) return <div className="glass rounded-tile p-6"><Cargando /></div>;

  return (
    <>
      <Encabezado titulo="Mi cuenta" descripcion="Datos de su tienda y su contraseña."
                  acciones={<Boton variante="secundario" icono={LogOut} onClick={() => { salir(); navegar("/ingresar", { replace: true }); }}>Salir</Boton>} />
      <Bento columnas={2}>
        <Mosaico  titulo="Datos de la tienda">
          <form onSubmit={guardarDatos} className="space-y-4" noValidate>
            <Campo etiqueta="Nombre de la tienda" name="usuario" value={datos.usuario} onChange={(e) => setDatos({ ...datos, usuario: e.target.value })} />
            <Campo etiqueta="Correo para ingresar" name="email" type="email" value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
            {error.datos && <p className="rounded-control bg-risk-high-soft px-4 py-3 text-risk-high" role="alert">{error.datos}</p>}
            <Boton type="submit" icono={Save} cargando={guardando === "datos"}>Guardar datos</Boton>
          </form>
        </Mosaico>
        <Mosaico  titulo="Cambiar contraseña">
          <form onSubmit={cambiarClave} className="space-y-4" noValidate>
            <Campo etiqueta="Nueva contraseña" name="contrasena" type="password" autoComplete="new-password" ayuda="Mínimo 6 caracteres"
                   value={clave.contrasena} onChange={(e) => setClave({ ...clave, contrasena: e.target.value })} />
            <Campo etiqueta="Repita la nueva contraseña" name="confirmar" type="password" autoComplete="new-password"
                   value={clave.confirmar} onChange={(e) => setClave({ ...clave, confirmar: e.target.value })} />
            {error.clave && <p className="rounded-control bg-risk-high-soft px-4 py-3 text-risk-high" role="alert">{error.clave}</p>}
            <Boton type="submit" icono={Save} cargando={guardando === "clave"}>Cambiar contraseña</Boton>
          </form>
        </Mosaico>
      </Bento>
    </>
  );
}
