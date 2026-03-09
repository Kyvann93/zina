"""
ZINA Cantine BAD - Main Application Entry Point
"""

import os
from dotenv import load_dotenv
from zina_app import create_app
from zina_app.config.default import DefaultConfig

load_dotenv()

# Create the Flask application
app = create_app(DefaultConfig)

if __name__ == '__main__':
    app.run(debug=True)
