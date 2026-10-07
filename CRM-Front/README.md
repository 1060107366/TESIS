# Frontend del prototipo
Se desarrolla el contenido del Frontend del prototipo de CRM utilizando modulos de inteligencia artificial.

## Instalación
### prove git push

Se ha implementado el uso de Bun JS para el desarrollo, test, ejecución y empaquetado del Frontend del proyecto.

Instalación de Bun:
```
powershell -c "irm bun.sh/install.ps1 | iex"
```
> [!WARNING]
>Después de instalar *Bun* te pedirá reiniciar la consola de comandos (cmd, powershell o donde ejecutaste el comando), si no reconoce ningún comando luego de reiniciar la consola, reinicie el ordenador e inténte nuevamente.


Iniciar el proyecto:
```
bun install
```
Las dependencias se instalan automáticamente al ejecutar `bun install` pero si no funcionan correctamente, las puedes instalar con el siguiente comando:
```
bun add react-router-dom zustand recharts lucide-react
```
### Instalación de TailwindCSS
Para los estilos utilizamos TailwindCSS, también se instala automáticamente pero si no funciona, se puede instalar ejecutando los siguientes comandos:
```
bun add -D tailwindcss postcss autoprefixer
bunx tailwindcss init -p
```
Verificamos que en el archivo `tailwind.config.js` se encuentre el content de la siguiente manera:
```
content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
],
```

> [!IMPORTANT]
> Si presenta problemas con alguna dependencia, visite el sitio oficial en linea para más información.

## Ejecutar el entorno de desarrollo
```
bun run dev
```

# React + Vite

Esta plantilla proporciona una configuración mínima para que React funcione en Vite con HMR y algunas reglas de ESLint.

Actualmente, hay dos plugins oficiales disponibles:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) utiliza [Babel](https://babeljs.io/) para una actualización rápida
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) utiliza [SWC](https://swc.rs/) para una actualización rápida

> [!NOTE]
> Este README se actualizará constantemente en caso de requerir agregar dependencias o informacion importante del proyecto.
