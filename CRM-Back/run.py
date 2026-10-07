import os
from app import create_app

# Crear la aplicacion
app = create_app()

DEBUG_MODE = os.getenv('DEBUG_MODE') == 'True'
PORT = os.getenv('PORT')

# Punto de entrada principal
if __name__ == '__main__':
    # Ejecutar la aplicacion en modo debug
     app.run(port=5001, debug=DEBUG_MODE)

    