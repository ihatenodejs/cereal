# cereal

## API keys

To generate an API key, run:

```bash
bun run scripts/create-api-key.ts
```

## Endpoints

### Authentication

All endpoints below require an `Authorization` header with a valid API key:

```
Authorization: Bearer <your-api-key>
```

### Products

- `POST /products/add`
  - Body: `{ "id": "string", "name": "string", "availableTiers": ["tier1", "tier2"] (optional) }`
- `POST /products/edit`
  - Body: `{ "id": "string", "name": "string" (optional), "availableTiers": ["tier1", "tier2"] (optional) }`
- `POST /products/delete`
  - Body: `{ "id": "string" }`
- `GET /products/list`
  - Query params: `limit` (default 10, max 100), `page` (default 1)

### Licenses

- `POST /licenses/add`
  - Body: `{ "productId": "string", "tier": "string" (optional), "expirationDate": "YYYY-MM-DD" (optional) }`
  - Note: `tier` is required if the product has `availableTiers` defined
- `POST /licenses/edit`
  - Body: `{ "key": "string", "productId": "string" (optional), "tier": "string" (optional), "expirationDate": "YYYY-MM-DD" (optional) }`
- `POST /licenses/delete`
  - Body: `{ "key": "string" }`
- `GET /licenses/list`
  - Query params: `limit` (default 10, max 100), `page` (default 1)
- `POST /licenses/validate` (No auth required)
  - Body: `{ "key": "string" }`
