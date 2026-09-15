import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from routers.admin_certificates import DEFAULT_TEMPLATES, get_certificate_templates, upload_certificate_template, delete_certificate_template
from database import MongoDB

async def test():
    print("Testing Certificate Templates Logic...")
    print(f"Total Default Templates: {len(DEFAULT_TEMPLATES)}")
    for t in DEFAULT_TEMPLATES:
        print(f"  - [{t['category']}] {t['name']} -> {t['imageUrl']}")
        assert os.path.exists(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public', t['imageUrl'].lstrip('/'))), f"Asset missing: {t['imageUrl']}"

    print("All default template image files verified in frontend/public!")

if __name__ == "__main__":
    asyncio.run(test())
