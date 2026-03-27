import os
import re

replacements = {
    r'from config import': r'from app.core.config import',
    r'import config': r'import app.core.config as config',
    r'from models\.schemas import': r'from app.core.schemas import',
    r'import middleware\.auth': r'from app.auth import middleware as auth_middleware',
    r'from middleware\.auth import': r'from app.auth.middleware import',
    r'from services\.google_calendar import': r'from app.integrations.google_calendar import',
    r'from services\.otl_service import': r'from app.links.service import',
    r'from services\.webhook_service import': r'from app.webhooks.service import',
    r'import services\.google_calendar': r'import app.integrations.google_calendar',
    r'from services import google_calendar, otl_service, webhook_service': r'from app.integrations import google_calendar\nfrom app.links import service as otl_service\nfrom app.webhooks import service as webhook_service',
    r'services\.otl_service': r'otl_service',
    r'services\.webhook_service': r'webhook_service',
    r'services\.google_calendar': r'google_calendar',
    r'from routers import .*': r'from app.auth.router import router as auth_router\nfrom app.availability.router import router as availability_router\nfrom app.bookings.router import router as bookings_router\nfrom app.links.router import router as links_router\nfrom app.webhooks.router import router as webhooks_router'
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, repl in replacements.items():
        content = re.sub(pattern, repl, content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('.'):
    for file in files:
        if file.endswith('.py') and file != 'refactor.py':
            process_file(os.path.join(root, file))

print("Done refactoring imports.")
