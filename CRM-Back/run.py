from dotenv import load_dotenv
load_dotenv()

import os
from app import create_app

app = create_app()

DEBUG_MODE = os.getenv('DEBUG_MODE') == 'True'
PORT = int(os.getenv('PORT', 5001))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=DEBUG_MODE)