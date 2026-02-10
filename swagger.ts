export const swaggerSpec = {
  openapi: "3.1.0",
  info: {
    title: "Cereal API",
    description:
      "License key management API for software products. Provides product registration, license key generation, and API key authentication.",
    version: "1.0.0",
    contact: {
      email: "aidan@p0ntus.com",
    },
    license: {
      name: "Unlicense",
      url: "https://unlicense.org/",
    },
  },
  servers: [
    {
      url: "https://cereal.aidan.so",
      description: "Production server",
    },
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Health check and server status endpoints",
    },
    {
      name: "Products",
      description:
        "Product/application management endpoints (requires authentication)",
    },
    {
      name: "Licenses",
      description: "License key management endpoints (requires authentication)",
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Health check endpoint",
        description:
          "Returns server health status including uptime and API version",
        operationId: "getHealth",
        tags: ["Health"],
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    runtime: {
                      type: "number",
                      description: "Server uptime in seconds",
                      example: 3600.5,
                    },
                    version: {
                      type: "string",
                      description: "API version",
                      example: "1.0.0",
                    },
                  },
                  required: ["runtime", "version"],
                },
                example: {
                  runtime: 3600.5,
                  version: "1.0.0",
                },
              },
            },
          },
        },
      },
    },
    "/products/add": {
      post: {
        summary: "Create a new product",
        description:
          "Register a new software product/application that can have licenses",
        operationId: "addProduct",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "Unique product identifier",
                    minLength: 1,
                    example: "myapp",
                  },
                  name: {
                    type: "string",
                    description: "Human-readable product name",
                    minLength: 1,
                    example: "My Application",
                  },
                },
                required: ["id", "name"],
              },
              example: {
                id: "myapp",
                name: "My Application",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Product created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    id: {
                      type: "string",
                      example: "myapp",
                    },
                    name: {
                      type: "string",
                      example: "My Application",
                    },
                  },
                  required: ["success", "id", "name"],
                },
                example: {
                  success: true,
                  id: "myapp",
                  name: "My Application",
                },
              },
            },
          },
          "400": {
            description: "Missing required fields (id or name)",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Missing id or name",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "405": {
            description: "Method not allowed - Only POST is supported",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Method Not Allowed",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/products/edit": {
      post: {
        summary: "Update an existing product",
        description: "Modify the name of an existing product/application",
        operationId: "editProduct",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "Product identifier to update",
                    minLength: 1,
                    example: "myapp",
                  },
                  name: {
                    type: "string",
                    description: "New product name (optional)",
                    minLength: 1,
                    example: "My Updated Application",
                  },
                },
                required: ["id"],
              },
              example: {
                id: "myapp",
                name: "My Updated Application",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Product updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    id: {
                      type: "string",
                      example: "myapp",
                    },
                  },
                  required: ["success", "id"],
                },
                example: {
                  success: true,
                  id: "myapp",
                },
              },
            },
          },
          "400": {
            description: "Missing required field (id)",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Missing id",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "405": {
            description: "Method not allowed - Only POST is supported",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Method Not Allowed",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/products/delete": {
      post: {
        summary: "Delete a product",
        description:
          "Remove a product/application from the system. Note: This may affect associated licenses.",
        operationId: "deleteProduct",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "Product identifier to delete",
                    minLength: 1,
                    example: "myapp",
                  },
                },
                required: ["id"],
              },
              example: {
                id: "myapp",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Product deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    id: {
                      type: "string",
                      example: "myapp",
                    },
                  },
                  required: ["success", "id"],
                },
                example: {
                  success: true,
                  id: "myapp",
                },
              },
            },
          },
          "400": {
            description: "Missing required field (id)",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Missing id",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "405": {
            description: "Method not allowed - Only POST is supported",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Method Not Allowed",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/products/list": {
      get: {
        summary: "List all products",
        description: "Retrieve a paginated list of all registered products",
        operationId: "listProducts",
        tags: ["Products"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of items to return (default 10, max 100)",
            schema: {
              type: "integer",
              default: 10,
              maximum: 100,
            },
          },
          {
            name: "page",
            in: "query",
            description: "Page number (default 1)",
            schema: {
              type: "integer",
              default: 1,
              minimum: 1,
            },
          },
        ],
        responses: {
          "200": {
            description: "List of products",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        example: "myapp",
                      },
                      name: {
                        type: "string",
                        example: "My Application",
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2024-01-01T00:00:00.000Z",
                      },
                    },
                    required: ["id", "name", "createdAt"],
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/licenses/add": {
      post: {
        summary: "Generate a new license key",
        description:
          "Create a new license key for a product. The license key is automatically generated as a UUID.",
        operationId: "addLicense",
        tags: ["Licenses"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productId: {
                    type: "string",
                    description:
                      "Product identifier to associate with this license",
                    minLength: 1,
                    example: "myapp",
                  },
                  tier: {
                    type: "string",
                    enum: ["basic", "max"],
                    description: "Optional license tier",
                    example: "max",
                  },
                  expirationDate: {
                    type: "string",
                    format: "date-time",
                    description:
                      "Optional expiration date in ISO 8601 format (YYYY-MM-DD or full datetime)",
                    example: "2025-12-31",
                  },
                },
                required: ["productId"],
              },
              examples: {
                "Without expiration": {
                  value: {
                    productId: "myapp",
                  },
                },
                "With expiration": {
                  value: {
                    productId: "myapp",
                    expirationDate: "2025-12-31",
                  },
                },
                "With tier": {
                  value: {
                    productId: "myapp",
                    tier: "max",
                    expirationDate: "2025-12-31",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "License created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    key: {
                      type: "string",
                      format: "uuid",
                      description: "Generated license key (UUID format)",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                  },
                  required: ["success", "key"],
                },
                example: {
                  success: true,
                  key: "550e8400-e29b-41d4-a716-446655440000",
                },
              },
            },
          },
          "400": {
            description: "Missing required field (productId)",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Missing productId",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "405": {
            description: "Method not allowed - Only POST is supported",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Method Not Allowed",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/licenses/edit": {
      post: {
        summary: "Update an existing license",
        description:
          "Modify a license key's product association, tier, or expiration date",
        operationId: "editLicense",
        tags: ["Licenses"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  key: {
                    type: "string",
                    description: "License key to update",
                    minLength: 1,
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                  productId: {
                    type: "string",
                    description:
                      "New product identifier (optional - updates product association)",
                    example: "myapp",
                  },
                  tier: {
                    type: "string",
                    enum: ["basic", "max"],
                    description: "New tier (optional - updates license tier)",
                    example: "max",
                  },
                  expirationDate: {
                    type: "string",
                    format: "date-time",
                    description:
                      "New expiration date in ISO 8601 format (optional - updates expiration)",
                    example: "2026-06-30",
                  },
                },
                required: ["key"],
              },
              examples: {
                "Update product": {
                  value: {
                    key: "550e8400-e29b-41d4-a716-446655440000",
                    productId: "newapp",
                  },
                },
                "Update expiration": {
                  value: {
                    key: "550e8400-e29b-41d4-a716-446655440000",
                    expirationDate: "2026-06-30",
                  },
                },
                "Update tier": {
                  value: {
                    key: "550e8400-e29b-41d4-a716-446655440000",
                    tier: "basic",
                  },
                },
                "Update all": {
                  value: {
                    key: "550e8400-e29b-41d4-a716-446655440000",
                    productId: "newapp",
                    tier: "max",
                    expirationDate: "2026-06-30",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "License updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    key: {
                      type: "string",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                  },
                  required: ["success", "key"],
                },
                example: {
                  success: true,
                  key: "550e8400-e29b-41d4-a716-446655440000",
                },
              },
            },
          },
          "400": {
            description: "Missing required field (key)",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Missing key",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "405": {
            description: "Method not allowed - Only POST is supported",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Method Not Allowed",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/licenses/delete": {
      post: {
        summary: "Revoke a license key",
        description: "Delete/revoke a license key from the system",
        operationId: "deleteLicense",
        tags: ["Licenses"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  key: {
                    type: "string",
                    description: "License key to delete",
                    minLength: 1,
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                },
                required: ["key"],
              },
              example: {
                key: "550e8400-e29b-41d4-a716-446655440000",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "License deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    key: {
                      type: "string",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                  },
                  required: ["success", "key"],
                },
                example: {
                  success: true,
                  key: "550e8400-e29b-41d4-a716-446655440000",
                },
              },
            },
          },
          "400": {
            description: "Missing required field (key)",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Missing key",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "405": {
            description: "Method not allowed - Only POST is supported",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Method Not Allowed",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/licenses/list": {
      get: {
        summary: "List all licenses",
        description: "Retrieve a paginated list of all generated licenses",
        operationId: "listLicenses",
        tags: ["Licenses"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of items to return (default 10, max 100)",
            schema: {
              type: "integer",
              default: 10,
              maximum: 100,
            },
          },
          {
            name: "page",
            in: "query",
            description: "Page number (default 1)",
            schema: {
              type: "integer",
              default: 1,
              minimum: 1,
            },
          },
        ],
        responses: {
          "200": {
            description: "List of licenses",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: {
                        type: "string",
                        example: "550e8400-e29b-41d4-a716-446655440000",
                      },
                      productId: {
                        type: "string",
                        example: "myapp",
                      },
                      expirationDate: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                        example: "2025-12-31T00:00:00.000Z",
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2024-01-01T00:00:00.000Z",
                      },
                    },
                    required: ["key", "productId", "createdAt"],
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Unauthorized",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/licenses/validate": {
      post: {
        summary: "Validate a license key",
        description:
          "Validates a license key and returns license information. This endpoint does not require authentication.",
        operationId: "validateLicense",
        tags: ["Licenses"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["key"],
                properties: {
                  key: {
                    type: "string",
                    format: "uuid",
                    description: "License key to validate",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Validation result",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      description: "Valid license",
                      properties: {
                        valid: {
                          type: "boolean",
                          example: true,
                        },
                        productId: {
                          type: "string",
                          example: "am-max",
                        },
                        tier: {
                          type: "string",
                          enum: ["basic", "max"],
                          nullable: true,
                          example: "max",
                        },
                        expirationDate: {
                          type: "string",
                          format: "date-time",
                          nullable: true,
                          example: "2026-12-31T23:59:59Z",
                        },
                        createdAt: {
                          type: "string",
                          format: "date-time",
                          example: "2025-02-10T12:00:00Z",
                        },
                      },
                    },
                    {
                      type: "object",
                      description: "Invalid license",
                      properties: {
                        valid: {
                          type: "boolean",
                          example: false,
                        },
                        reason: {
                          type: "string",
                          example: "License key not found",
                        },
                        expirationDate: {
                          type: "string",
                          format: "date-time",
                          nullable: true,
                          description: "Only included for expired licenses",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Bad request (missing key)",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Missing key",
                },
              },
            },
          },
          "405": {
            description: "Method not allowed - Only POST is supported",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Method Not Allowed",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Internal Server Error",
                },
              },
            },
          },
        },
      },
    },
    "/swagger": {
      get: {
        summary: "Swagger UI documentation",
        description: "Interactive API documentation interface",
        operationId: "getSwaggerUI",
        tags: ["Documentation"],
        responses: {
          "200": {
            description: "Swagger UI HTML page",
            content: {
              "text/html": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    "/swagger.json": {
      get: {
        summary: "OpenAPI specification",
        description: "Returns the OpenAPI 3.1.0 specification in JSON format",
        operationId: "getSwaggerJSON",
        tags: ["Documentation"],
        responses: {
          "200": {
            description: "OpenAPI specification",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "UUID",
        description:
          "API key authentication. Obtain an API key using the create-api-key.ts script, then include it in the Authorization header as 'Bearer YOUR-API-KEY'",
      },
    },
    schemas: {
      Product: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique product identifier",
            example: "myapp",
          },
          name: {
            type: "string",
            description: "Human-readable product name",
            example: "My Application",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the product was created",
            example: "2024-01-15T10:30:00Z",
          },
        },
        required: ["id", "name", "createdAt"],
      },
      License: {
        type: "object",
        properties: {
          key: {
            type: "string",
            format: "uuid",
            description: "Unique license key (UUID format)",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          productId: {
            type: "string",
            description: "Associated product identifier",
            example: "myapp",
          },
          tier: {
            type: "string",
            enum: ["basic", "max"],
            nullable: true,
            description: "License tier (optional)",
            example: "max",
          },
          expirationDate: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Expiration date (null if license never expires)",
            example: "2025-12-31T23:59:59Z",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the license was created",
            example: "2024-01-15T10:30:00Z",
          },
        },
        required: ["key", "productId", "createdAt"],
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
        },
        required: ["success"],
      },
      ErrorResponse: {
        type: "string",
        description: "Error message",
        example: "Error description",
      },
    },
  },
};
