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
  - Body: `{ "id": "string", "name": "string" }`
- `POST /products/edit`
  - Body: `{ "id": "string", "name": "string" }`
- `POST /products/delete`
  - Body: `{ "id": "string" }`

### Licenses

- `POST /licenses/add`
  - Body: `{ "productId": "string", "expirationDate": "YYYY-MM-DD" (optional) }`
- `POST /licenses/edit`
  - Body: `{ "key": "string", "productId": "string", "expirationDate": "YYYY-MM-DD" (optional) }`
- `POST /licenses/delete`
  - Body: `{ "key": "string" }`
