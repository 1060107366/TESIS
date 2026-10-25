"""
Prueba de humo de la API del CRM contra un backend en ejecución.

Uso (con el backend corriendo, p. ej. `python run.py` en otra terminal):
    python probar_api.py                         # http://localhost:5001
    python probar_api.py http://localhost:5001

Usa la tienda demo (creada con `python cargar_demo.py`) para las rutas de IA y
crea un usuario temporal para probar registro, CRUD de clientes y permisos.
Al final borra los clientes de prueba que creó (el usuario temporal queda registrado).
No necesita librerías adicionales (solo Python estándar).
"""
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5001").rstrip("/")
DEMO = {"email": "demo@tienda-demo.co", "contrasena": "Demo2026*"}
ORIGEN = "http://localhost:5173"
resultados = []


def llamar(metodo, ruta, token=None, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    req.add_header("Origin", ORIGEN)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            codigo, texto, cabeceras = r.status, r.read().decode(), dict(r.headers)
    except urllib.error.HTTPError as e:
        codigo, texto, cabeceras = e.code, e.read().decode(), dict(e.headers)
    ms = (time.time() - t0) * 1000
    try:
        cuerpo_resp = json.loads(texto) if texto else None
    except ValueError:
        cuerpo_resp = texto
    return codigo, cuerpo_resp, ms, cabeceras


def prueba(nombre, metodo, ruta, esperado, token=None, cuerpo=None, validar=None):
    codigo, resp, ms, cab = llamar(metodo, ruta, token, cuerpo)
    ok = codigo == esperado
    detalle = ""
    if ok and validar:
        try:
            r = validar(resp)
            ok = r is not False
            detalle = r if isinstance(r, str) else ""
        except Exception as e:     # validación fallida
            ok, detalle = False, f"validación: {e}"
    if not ok and not detalle:
        detalle = str(resp)[:160]
    resultados.append((ok, nombre, metodo, ruta, codigo, ms, detalle))
    print(f"{'✔' if ok else '✘'} {codigo} {ms:6.0f} ms  {metodo:6s} {ruta:48s} {nombre}  {detalle}")
    return resp, cab


def main():
    print(f"Probando {BASE}\n")
    sufijo = datetime.now().strftime("%H%M%S")

    print("== AUTH")
    prueba("login sin datos", "POST", "/auth/login", 400, cuerpo={})
    prueba("login con contraseña errada", "POST", "/auth/login", 401, cuerpo={**DEMO, "contrasena": "x"},
           validar=lambda r: "message" in r)
    r, cab = prueba("login tienda demo (email en mayúsculas)", "POST", "/auth/login", 200,
                    cuerpo={**DEMO, "email": DEMO["email"].upper()}, validar=lambda r: "access_token" in r)
    demo = r["access_token"]
    prueba("CORS permite el frontend", "GET", "/auth/me", 200, demo,
           validar=lambda r: cab.get("Access-Control-Allow-Origin") == ORIGEN or "sin cabecera CORS")
    prueba("me", "GET", "/auth/me", 200, demo, validar=lambda r: r["email"] == DEMO["email"])
    prueba("ruta protegida sin token", "GET", "/customer/", 401, validar=lambda r: "message" in r)
    usuario = {"usuario": f"prueba_{sufijo}", "email": f"Prueba_{sufijo}@Test.co", "contrasena": "secreta123"}
    r, _ = prueba("registro usuario temporal", "POST", "/auth/register", 201, cuerpo=usuario)
    temp = r["access_token"]
    prueba("registro duplicado", "POST", "/auth/register", 400, cuerpo=usuario)
    prueba("actualizar perfil", "PUT", "/auth/update", 200, temp, {"usuario": f"prueba2_{sufijo}"})
    prueba("login usuario temporal (email normalizado)", "POST", "/auth/login", 200,
           cuerpo={"email": usuario["email"].lower(), "contrasena": usuario["contrasena"]})

    print("\n== CUSTOMER")
    r, _ = prueba("listar clientes demo", "GET", "/customer/", 200, demo,
                  validar=lambda r: r["total_clientes"] >= 300 or f"solo {r['total_clientes']}")
    cliente_demo = r["clientes"][0]["id"]
    prueba("detalle cliente", "GET", f"/customer/{cliente_demo}", 200, demo, validar=lambda r: "segmento_id" in r)
    prueba("interacciones", "GET", f"/customer/{cliente_demo}/interacciones", 200, demo,
           validar=lambda r: isinstance(r, list) and len(r) > 0)
    prueba("métricas", "GET", f"/customer/metrics/{cliente_demo}", 200, demo, validar=lambda r: isinstance(r, list))
    prueba("actividad reciente", "GET", "/customer/actividad-reciente", 200, demo, validar=lambda r: isinstance(r, list))
    prueba("otro usuario NO ve el cliente", "GET", f"/customer/{cliente_demo}", 404, temp)
    prueba("otro usuario NO ve interacciones", "GET", f"/customer/{cliente_demo}/interacciones", 404, temp)
    prueba("otro usuario NO lo modifica", "PUT", f"/customer/update/{cliente_demo}", 404, temp, {"nombre": "x"})
    prueba("otro usuario NO lo elimina", "DELETE", f"/customer/delete/{cliente_demo}", 404, temp)

    prueba("crear sin campos", "POST", "/customer/create", 400, temp, {"nombre": "Ana"})
    prueba("crear con monto inválido", "POST", "/customer/create", 400, temp,
           {"nombre": "Ana", "email": "ana@x.co", "telefono": "3001", "valor_orden_total": "abc"})
    r, _ = prueba("crear cliente sin compra", "POST", "/customer/create", 201, temp,
                  {"nombre": "Ana Ruiz", "email": "ANA@x.co", "telefono": "3001112233"},
                  validar=lambda r: r["segmento_id"] == 4 and r["probabilidad_churn"] is None
                  or f"segmento={r['segmento_id']} riesgo={r['probabilidad_churn']}")
    nuevo = r["cliente_id"]
    prueba("crear correo repetido", "POST", "/customer/create", 400, temp,
           {"nombre": "Ana", "email": "ana@x.co", "telefono": "3009"}, validar=lambda r: "message" in r)
    r, _ = prueba("crear cliente con compra inicial", "POST", "/customer/create", 201, temp,
                  {"nombre": "Luis Paz", "email": "luis@x.co", "telefono": "3004445566", "valor_orden_total": 45000},
                  validar=lambda r: r["probabilidad_churn"] is not None and r["segmento_id"] in (1, 2, 3)
                  or f"segmento={r['segmento_id']} riesgo={r['probabilidad_churn']}")
    luis = r["cliente_id"]
    prueba("actualizar datos básicos", "PUT", f"/customer/update/{nuevo}", 200, temp,
           {"action": "update_basic", "nombre": "Ana María Ruiz"}, validar=lambda r: r["nombre"] == "Ana María Ruiz")
    prueba("actualizar con correo de otro cliente", "PUT", f"/customer/update/{nuevo}", 400, temp,
           {"action": "update_basic", "email": "luis@x.co"})
    prueba("compra monto 0", "PUT", f"/customer/update/{nuevo}", 400, temp,
           {"action": "new_interaction", "data_interaccion": {"monto": 0}})
    prueba("compra fecha inválida", "PUT", f"/customer/update/{nuevo}", 400, temp,
           {"action": "new_interaction", "data_interaccion": {"monto": 1000, "fecha_compra": "ayer"}})
    prueba("compra fecha futura", "PUT", f"/customer/update/{nuevo}", 400, temp,
           {"action": "new_interaction", "data_interaccion": {
               "monto": 1000, "fecha_compra": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S")}})
    hace_40 = (datetime.now() - timedelta(days=40)).strftime("%Y-%m-%d %H:%M:00")
    prueba("compra con fecha (formato del frontend)", "PUT", f"/customer/update/{nuevo}", 200, temp,
           {"action": "new_interaction", "data_interaccion": {"tipo_interaccion_id": 2, "monto": 38000,
                                                              "fecha_compra": hace_40}},
           validar=lambda r: r["total_compras"] == 1 and r["probabilidad_churn"] is not None
           and r["segmento_id"] in (1, 2, 3) or str(r))
    hace_90 = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    prueba("compra antigua no retrocede la última compra", "PUT", f"/customer/update/{nuevo}", 200, temp,
           {"action": "new_interaction", "data_interaccion": {"monto": 20000, "fecha_compra": hace_90}},
           validar=lambda r: r["ultima_compra"].startswith(hace_40[:10]) or r["ultima_compra"])
    prueba("acción desconocida", "PUT", f"/customer/update/{nuevo}", 400, temp, {"action": "otra"})

    print("\n== PREDICTIONS (modelos de IA)")
    prueba("predict-churn GET (frontend actual)", "GET", "/predictions/predict-churn", 200, demo,
           validar=lambda r: r["clientes"] >= 300)
    prueba("predict-churn POST", "POST", "/predictions/predict-churn", 200, temp,
           validar=lambda r: r["clientes"] == 2 and r["sin_historial"] == 0 or str(r))
    prueba("detalle riesgo", "GET", f"/predictions/churn/{cliente_demo}", 200, demo,
           validar=lambda r: r["nivel"] in ("bajo", "medio", "alto") and isinstance(r["razones"], list))
    prueba("riesgo de cliente ajeno", "GET", f"/predictions/churn/{cliente_demo}", 404, temp)
    prueba("info modelo churn", "GET", "/predictions/churn/modelo", 200, demo,
           validar=lambda r: r["version"].startswith("2.") and r["roc_auc_test"] > 0.7)
    prueba("monitoreo PSI", "GET", "/predictions/churn/monitoreo", 200, demo, validar=lambda r: "psi" in r)
    prueba("churn promedio", "GET", "/predictions/global/churn_avg", 200, demo)
    prueba("segmentar clientes", "POST", "/predictions/segment-clients", 200, demo)
    prueba("segmento de un cliente", "GET", f"/predictions/segmentos/cliente/{cliente_demo}", 200, demo,
           validar=lambda r: r["segmento"] in ("Bajo valor", "Medio valor", "Alto valor", "Nuevos") or r["segmento"])
    prueba("resumen por segmento", "GET", "/predictions/segmentos/resumen", 200, demo,
           validar=lambda r: sum(x["clientes"] for x in r) >= 300)
    prueba("info modelo segmentación", "GET", "/predictions/segmentos/modelo", 200, demo,
           validar=lambda r: len(r["perfiles"]) >= 3 and r["segmentos"]["2"] == "Medio valor" or r["segmentos"])

    print("\n== TRENDS")
    prueba("ingresos mensuales (12 meses)", "GET", "/trends/global/ingresos_mensuales", 200, demo,
           validar=lambda r: len(r) == 12 and sum(x["value"] for x in r) > 0)
    prueba("ingresos mes anterior", "GET", "/trends/global/ingresos_ultimo_mes", 200, demo,
           validar=lambda r: r["total_ingresos"] > 0 and r["mes"] or str(r))
    prueba("actividad mensual (6 meses)", "GET", "/trends/global/actividad_mensual", 200, demo,
           validar=lambda r: len(r) == 6)
    prueba("frecuencia de compra global", "GET", "/trends/global/frecuencia_compra", 200, demo,
           validar=lambda r: len(r) > 0)
    prueba("valor medio de orden global", "GET", "/trends/global/valor_medio_orden", 200, demo,
           validar=lambda r: len(r) > 0)
    prueba("clientes por segmento", "GET", "/trends/global/clientes_por_segmento", 200, demo,
           validar=lambda r: {x["name"] for x in r} <= {"Bajo valor", "Medio valor", "Alto valor", "Nuevos"}
           or str(r))
    prueba("frecuencia de un cliente", "GET", f"/trends/customer/{cliente_demo}/frecuencia_compra", 200, demo)
    prueba("valor medio de un cliente", "GET", f"/trends/customer/{cliente_demo}/valor_medio_orden", 200, demo)
    prueba("tendencia de cliente ajeno", "GET", f"/trends/customer/{cliente_demo}/valor_medio_orden", 404, temp)

    print("\n== RECOMENDACIONES")
    prueba("catálogo", "GET", "/recomendaciones/catalogo", 200, demo, validar=lambda r: len(r) >= 3)
    prueba("recomendaciones de un cliente", "GET", f"/recomendaciones/{cliente_demo}", 200, demo)
    prueba("generar todas", "POST", "/recomendaciones/generar-todos", 200, demo, validar=lambda r: r["errores"] == 0)
    prueba("generar todas (2ª vez, sin duplicar)", "POST", "/recomendaciones/generar-todos", 200, demo,
           validar=lambda r: r["errores"] == 0)

    print("\n== LIMPIEZA")
    prueba("eliminar cliente de prueba", "DELETE", f"/customer/delete/{nuevo}", 200, temp)
    prueba("eliminar cliente de prueba", "DELETE", f"/customer/delete/{luis}", 200, temp)
    prueba("cliente eliminado ya no existe", "GET", f"/customer/{nuevo}", 404, temp)

    total, fallas = len(resultados), [r for r in resultados if not r[0]]
    lentas = sorted(resultados, key=lambda r: -r[5])[:3]
    print(f"\nResultado: {total - len(fallas)}/{total} pruebas correctas")
    print("Más lentas: " + ", ".join(f"{m} {ruta} {ms:.0f} ms" for _, _, m, ruta, _, ms, _ in lentas))
    for _, nombre, m, ruta, c, _, d in fallas:
        print(f"  ✘ {m} {ruta} ({c}) {nombre}: {d}")
    sys.exit(1 if fallas else 0)


if __name__ == "__main__":
    main()
