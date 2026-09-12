from app.main import app

openapi = app.openapi()
paths = list(openapi.get("paths", {}).keys())
print("Total OpenAPI Endpoints:", len(paths))
for p in sorted(paths):
    print(" - Endpoint:", p)
