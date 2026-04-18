import { version } from "./package.json";

export const swaggerSpec = {
  openapi: "3.1.0",
  info: {
    title: "Cereal API",
    description:
      "License key management API for software products. Provides product registration, license key generation, and API key authentication.",
    version,
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
    {
      name: "Downloads",
      description:
        "Binary and zip file management. Admins upload files via Bearer auth; licensed users access files using their license key.",
    },
    {
      name: "Git Downloads",
      description:
        "GitHub repository-based downloads. Clone files from GitHub repos and track sync history. Requires authentication.",
    },
    {
      name: "Documentation",
      description: "API documentation and OpenAPI specification endpoints",
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
          "Register a new software product/application that can have licenses. Optionally specify availableTiers to enforce tier-based licensing. If availableTiers is set, all licenses for this product must specify a valid tier.",
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
                  availableTiers: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description:
                      "Optional array of available tier names (e.g., ['starter', 'pro', 'enterprise']). If specified, licenses for this product will require a tier from this list.",
                    example: ["starter", "pro", "enterprise"],
                  },
                },
                required: ["id", "name"],
              },
              examples: {
                "Simple product": {
                  value: {
                    id: "myapp",
                    name: "My Application",
                  },
                },
                "Product with tiers": {
                  value: {
                    id: "myapp",
                    name: "My Application",
                    availableTiers: ["starter", "pro", "enterprise"],
                  },
                },
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
            description:
              "Missing required fields (id or name) or invalid availableTiers",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "Missing id or name",
                    "availableTiers must be an array",
                    "availableTiers cannot contain empty strings",
                    "availableTiers cannot contain duplicates",
                  ],
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
        description:
          "Modify the name or available tiers of an existing product/application. When updating availableTiers, existing licenses with invalid tiers will need to be updated separately. Pass an empty array to remove tier requirements.",
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
                  availableTiers: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description:
                      "New array of available tier names (optional). Pass empty array to remove all tiers.",
                    example: ["basic", "premium"],
                  },
                },
                required: ["id"],
              },
              examples: {
                "Update name": {
                  value: {
                    id: "myapp",
                    name: "My Updated Application",
                  },
                },
                "Add tiers": {
                  value: {
                    id: "myapp",
                    availableTiers: ["basic", "premium"],
                  },
                },
                "Remove tiers": {
                  value: {
                    id: "myapp",
                    availableTiers: [],
                  },
                },
                "Update name and tiers": {
                  value: {
                    id: "myapp",
                    name: "My Updated Application",
                    availableTiers: ["starter", "professional", "enterprise"],
                  },
                },
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
            description:
              "Missing required field (id) or invalid availableTiers",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "Missing id",
                    "availableTiers must be an array",
                    "availableTiers cannot contain empty strings",
                    "availableTiers cannot contain duplicates",
                  ],
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
          "Remove a product/application from the system. Warning: Associated licenses will remain in the database but may become invalid if the product is required for validation. Consider cleaning up licenses before deleting a product.",
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
        description:
          "Retrieve a paginated list of all registered products. Returns product details including ID, name, available tiers (if any), and creation timestamp.",
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
                      availableTiers: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                        nullable: true,
                        description: "Available tier names for this product",
                        example: ["starter", "pro"],
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
          "Create a new license key for a product. The license key is automatically generated as a UUID. If the product has availableTiers defined, a tier must be provided and must be one of the product's available tiers.",
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
                    description:
                      "License tier. Required if product has availableTiers defined. Must be one of the product's available tiers.",
                    example: "pro",
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
                    tier: "pro",
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
            description:
              "Missing required field (productId), invalid tier, or tier required but not provided",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "Missing productId",
                    "Product 'myapp' requires a tier. Available tiers: starter, pro, enterprise",
                    "Invalid tier 'premium' for product 'myapp'. Available tiers: starter, pro, enterprise",
                    "Product 'myapp' does not support tiers",
                  ],
                },
              },
            },
          },
          "404": {
            description: "Product not found",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Product 'myapp' not found",
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
          "Modify a license key's product association, tier, or expiration date. Tier validation is performed against the target product's availableTiers. If changing the product, ensure the new product supports the license's tier (or update the tier as well).",
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
                    description:
                      "New tier (optional - updates license tier). Must be valid for the product.",
                    example: "pro",
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
                    tier: "pro",
                  },
                },
                "Update all": {
                  value: {
                    key: "550e8400-e29b-41d4-a716-446655440000",
                    productId: "newapp",
                    tier: "enterprise",
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
            description:
              "Missing required field (key), invalid tier, or tier validation failure",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "Missing key",
                    "Product 'myapp' requires a tier. Available tiers: starter, pro",
                    "Invalid tier 'premium' for product 'myapp'. Available tiers: starter, pro",
                    "Product 'myapp' does not support tiers",
                  ],
                },
              },
            },
          },
          "404": {
            description: "License or product not found",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "License 'key-123' not found",
                    "Product 'myapp' not found",
                  ],
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
        description:
          "Delete/revoke a license key from the system. This action is permanent and the license will immediately become invalid for validation requests.",
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
        description:
          "Retrieve a paginated list of all generated licenses. Returns license details including key, product ID, tier (if applicable), expiration date, and creation timestamp.",
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
                      tier: {
                        type: "string",
                        nullable: true,
                        description: "License tier (if applicable)",
                        example: "pro",
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
          "Validates a license key and returns license information including product ID, tier (if applicable), and expiration date. This endpoint does NOT require authentication and can be called by end-user applications to verify license validity.",
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
                          nullable: true,
                          description:
                            "License tier (dynamically validated against product's availableTiers)",
                          example: "pro",
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
                examples: {
                  "Valid license with tier": {
                    value: {
                      valid: true,
                      productId: "myapp",
                      tier: "pro",
                      expirationDate: "2026-12-31T23:59:59Z",
                      createdAt: "2025-02-10T12:00:00Z",
                    },
                  },
                  "Valid license without tier or expiration": {
                    value: {
                      valid: true,
                      productId: "myapp",
                      tier: null,
                      expirationDate: null,
                      createdAt: "2025-02-10T12:00:00Z",
                    },
                  },
                  "License not found": {
                    value: {
                      valid: false,
                      reason: "License key not found",
                    },
                  },
                  "Expired license": {
                    value: {
                      valid: false,
                      reason: "License has expired",
                      expirationDate: "2024-12-31T23:59:59Z",
                    },
                  },
                  "License product missing": {
                    value: {
                      valid: false,
                      reason: "License product not found",
                    },
                  },
                  "License tier mismatch": {
                    value: {
                      valid: false,
                      reason: "License tier is invalid for product",
                    },
                  },
                  "Untiered product with tiered license": {
                    value: {
                      valid: false,
                      reason:
                        "License has tier but product does not support tiers",
                    },
                  },
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
    "/downloads/upload": {
      post: {
        summary: "Upload a binary or zip file",
        description:
          "Upload a file and link it to a product with a version tag. If a file with the same version already exists for the product, it is replaced. Computes and stores a SHA256 checksum automatically. Requires admin Bearer authentication.",
        operationId: "uploadDownload",
        tags: ["Downloads"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["productId", "version", "file"],
                properties: {
                  productId: {
                    type: "string",
                    description: "Product identifier this file belongs to",
                    example: "myapp",
                  },
                  version: {
                    type: "string",
                    description: "Version tag for this file (e.g. 1.2.0)",
                    example: "1.2.0",
                  },
                  file: {
                    type: "string",
                    format: "binary",
                    description: "The binary or zip file to upload",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    id: {
                      type: "string",
                      format: "uuid",
                      description: "Unique identifier for this download entry",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                    sha256: {
                      type: "string",
                      description: "SHA256 checksum of the uploaded file",
                      example:
                        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    },
                  },
                  required: ["success", "id", "sha256"],
                },
              },
            },
          },
          "400": {
            description: "Missing required fields or wrong content-type",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "Missing productId",
                    "Missing version",
                    "Missing file",
                    "Content-Type must be multipart/form-data",
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Unauthorized" },
              },
            },
          },
          "404": {
            description: "Product not found",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Product 'myapp' not found",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
              },
            },
          },
        },
      },
    },
    "/downloads/delete": {
      post: {
        summary: "Delete a download entry",
        description:
          "Remove a file entry from the database and delete the file from disk. Requires admin Bearer authentication.",
        operationId: "deleteDownload",
        tags: ["Downloads"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    description: "Download entry ID to delete",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
              example: { id: "550e8400-e29b-41d4-a716-446655440000" },
            },
          },
        },
        responses: {
          "200": {
            description: "File deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    id: {
                      type: "string",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                  },
                  required: ["success", "id"],
                },
              },
            },
          },
          "400": {
            description: "Missing required field (id)",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Missing id" },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Unauthorized" },
              },
            },
          },
          "404": {
            description: "Download entry not found",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Download '550e8400-...' not found",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
              },
            },
          },
        },
      },
    },
    "/downloads/list": {
      get: {
        summary: "List all download entries",
        description:
          "Retrieve a paginated list of all uploaded files with their metadata. Does not expose the internal file path. Requires admin Bearer authentication.",
        operationId: "listDownloads",
        tags: ["Downloads"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of items to return (default 10, max 100)",
            schema: { type: "integer", default: 10, maximum: 100 },
          },
          {
            name: "page",
            in: "query",
            description: "Page number (default 1)",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "List of download entries",
            content: {
              "application/json": {
                schema: {
                  description:
                    "For regular uploads, version is the uploaded release version (e.g. 1.2.0). For Git downloads, displayVersion is the first 8 characters of commitSha.",
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000",
                      },
                      productId: { type: "string", example: "myapp" },
                      version: { type: "string", example: "1.2.0" },
                      displayVersion: {
                        type: "string",
                        description:
                          "Short display identifier for Git downloads (first 8 chars of commitSha)",
                        example: "a1b2c3d4",
                      },
                      commitSha: {
                        type: "string",
                        description: "Full Git commit SHA (Git downloads only)",
                        example: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8g9h0",
                      },
                      sourceType: {
                        type: "string",
                        description:
                          "Git source mode for Git downloads: repository file or latest release asset",
                        enum: ["repo_file", "release_asset"],
                        example: "repo_file",
                      },
                      assetName: {
                        type: "string",
                        nullable: true,
                        description: "Tracked release asset filename",
                        example: "app-1.2.0.zip",
                      },
                      releaseTag: {
                        type: "string",
                        nullable: true,
                        description:
                          "Latest release tag when sourceType=release_asset",
                        example: "v1.2.0",
                      },
                      releaseId: {
                        type: "string",
                        nullable: true,
                        description:
                          "Latest release identifier when sourceType=release_asset",
                        example: "123456789",
                      },
                      filename: {
                        type: "string",
                        example: "myapp-1.2.0-linux-amd64.zip",
                      },
                      sha256: {
                        type: "string",
                        example:
                          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2024-01-01T00:00:00.000Z",
                      },
                      github: {
                        type: "boolean",
                        description:
                          "Whether this entry is Git-based (true) or a regular upload (false)",
                        example: false,
                      },
                    },
                    required: [
                      "id",
                      "productId",
                      "filename",
                      "sha256",
                      "github",
                      "createdAt",
                    ],
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Unauthorized" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
              },
            },
          },
        },
      },
    },
    "/downloads/files": {
      get: {
        summary: "List available files for a license",
        description:
          "Returns all downloadable files linked to the product associated with the provided license key. Each entry includes the version, filename, a direct download URL, and the SHA256 checksum. No admin authentication required — a valid license key is sufficient.",
        operationId: "getDownloadFiles",
        tags: ["Downloads"],
        parameters: [
          {
            name: "licenseKey",
            in: "query",
            required: true,
            description: "Valid license key",
            schema: { type: "string", format: "uuid" },
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
        responses: {
          "200": {
            description: "List of available files",
            content: {
              "application/json": {
                schema: {
                  description:
                    "For regular uploads, version is the uploaded release version (e.g. 1.2.0). For Git downloads, displayVersion is the first 8 characters of commitSha.",
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000",
                      },
                      version: { type: "string", example: "1.2.0" },
                      displayVersion: {
                        type: "string",
                        description:
                          "Short display identifier for Git downloads (first 8 chars of commitSha)",
                        example: "a1b2c3d4",
                      },
                      commitSha: {
                        type: "string",
                        description: "Full Git commit SHA (Git downloads only)",
                        example: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8g9h0",
                      },
                      sourceType: {
                        type: "string",
                        description:
                          "Git source mode for Git downloads: repository file or latest release asset",
                        enum: ["repo_file", "release_asset"],
                        example: "repo_file",
                      },
                      assetName: {
                        type: "string",
                        nullable: true,
                        description: "Tracked release asset filename",
                        example: "app-1.2.0.zip",
                      },
                      releaseTag: {
                        type: "string",
                        nullable: true,
                        description:
                          "Latest release tag when sourceType=release_asset",
                        example: "v1.2.0",
                      },
                      releaseId: {
                        type: "string",
                        nullable: true,
                        description:
                          "Latest release identifier when sourceType=release_asset",
                        example: "123456789",
                      },
                      filename: {
                        type: "string",
                        example: "myapp-1.2.0-linux-amd64.zip",
                      },
                      url: {
                        type: "string",
                        description:
                          "Direct download URL (includes licenseKey)",
                        example:
                          "https://cereal.aidan.so/downloads/get/550e8400-e29b-41d4-a716-446655440000?licenseKey=...",
                      },
                      sha256: {
                        type: "string",
                        example:
                          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2024-01-01T00:00:00.000Z",
                      },
                      github: {
                        type: "boolean",
                        description:
                          "Whether this entry is Git-based (true) or a regular upload (false)",
                        example: false,
                      },
                    },
                    required: [
                      "id",
                      "filename",
                      "url",
                      "sha256",
                      "github",
                      "createdAt",
                    ],
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing licenseKey query parameter",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Missing licenseKey" },
              },
            },
          },
          "403": {
            description: "Invalid or expired license key",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean", example: false },
                    reason: {
                      type: "string",
                      example: "License key not found",
                    },
                  },
                },
              },
            },
          },
          "405": {
            description: "Method not allowed",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Method Not Allowed" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
              },
            },
          },
        },
      },
    },
    "/downloads/get/{id}": {
      get: {
        summary: "Download a file",
        description:
          "Streams a file to the client after validating the provided license key. The license must be valid and associated with the same product as the file. No admin authentication required.",
        operationId: "getDownloadFile",
        tags: ["Downloads"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Download entry ID",
            schema: { type: "string", format: "uuid" },
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          {
            name: "licenseKey",
            in: "query",
            required: true,
            description: "Valid license key",
            schema: { type: "string", format: "uuid" },
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          {
            name: "plaintext",
            in: "query",
            required: false,
            description:
              "If 'true', returns file content as plaintext for viewing instead of downloading",
            schema: { type: "string", enum: ["true", "false"] },
            example: "true",
          },
        ],
        responses: {
          "200": {
            description:
              "File content - either streamed as download (default) or as plaintext if plaintext=true",
            headers: {
              "Content-Disposition": {
                description:
                  "'inline' for plaintext mode, 'attachment' for download mode (with filename)",
                schema: { type: "string" },
              },
              "X-SHA256": {
                description: "SHA256 checksum of the file",
                schema: { type: "string" },
              },
            },
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
              "text/plain": {
                schema: { type: "string" },
              },
            },
          },
          "400": {
            description: "Missing licenseKey query parameter",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Missing licenseKey" },
              },
            },
          },
          "403": {
            description: "Invalid or expired license key",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean", example: false },
                    reason: {
                      type: "string",
                      example: "License has expired",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "File not found or not accessible with this license",
            content: {
              "text/plain": {
                schema: { type: "string", example: "File not found" },
              },
            },
          },
          "405": {
            description: "Method not allowed",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Method Not Allowed" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
              },
            },
          },
        },
      },
    },
    "/downloads/git/add": {
      post: {
        summary: "Add a Git download from GitHub",
        description:
          "Create a Git-based download and track updates. Supports repository file mode and latest release asset mode. Requires GITHUB_TOKEN environment variable for private repositories.",
        operationId: "addGitDownload",
        tags: ["Git Downloads"],
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
                      "Product identifier to associate with this download",
                    example: "myapp",
                  },
                  repoUrl: {
                    type: "string",
                    description:
                      "GitHub repository URL (e.g., https://github.com/owner/repo)",
                    example: "https://github.com/owner/repo",
                  },
                  source: {
                    type: "string",
                    enum: ["repo_file", "release_asset"],
                    description:
                      "Download source mode: repo_file tracks a repository path; release_asset tracks the latest release asset by filename",
                    default: "repo_file",
                    example: "repo_file",
                  },
                  filePath: {
                    type: "string",
                    description:
                      "Path to the file within the repository (required when source=repo_file)",
                    example: "dist/app-1.0.0.zip",
                  },
                  assetName: {
                    type: "string",
                    description:
                      "Release asset filename to fetch from latest release (required when source=release_asset)",
                    example: "app-1.0.0.zip",
                  },
                  branch: {
                    type: "string",
                    description: "Branch toclone from (defaults to 'main')",
                    default: "main",
                    example: "main",
                  },
                },
              },
              example: {
                productId: "myapp",
                repoUrl: "https://github.com/owner/repo",
                source: "repo_file",
                filePath: "dist/app-1.0.0.zip",
                branch: "main",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Git download created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    id: {
                      type: "string",
                      format: "uuid",
                      description: "Unique identifier for this git download",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                    commitSha: {
                      type: "string",
                      description: "Current commit SHA",
                      example: "a1b2c3d4e5f6...",
                    },
                    sha256: {
                      type: "string",
                      description: "SHA256 checksum of the extracted file",
                      example:
                        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    },
                    sourceType: {
                      type: "string",
                      enum: ["repo_file", "release_asset"],
                      example: "repo_file",
                    },
                    releaseTag: {
                      type: "string",
                      nullable: true,
                      description: "Latest release tag for release_asset mode",
                      example: "v1.2.3",
                    },
                    releaseId: {
                      type: "string",
                      nullable: true,
                      description: "Latest release id for release_asset mode",
                      example: "123456789",
                    },
                  },
                  required: [
                    "success",
                    "id",
                    "commitSha",
                    "sha256",
                    "sourceType",
                  ],
                },
              },
            },
          },
          "400": {
            description: "Missing required fields or clone failed",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "Missing productId",
                    "Missing repoUrl",
                    "Missing filePath",
                    "Missing assetName",
                    "Clone failed: ...",
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Unauthorized" },
              },
            },
          },
          "403": {
            description: "Authentication failed for private repository",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example:
                    "Authentication failed. Check GITHUB_TOKEN for private repos.",
                },
              },
            },
          },
          "404": {
            description: "Product, release, or file not found",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: [
                    "Product 'myapp' not found",
                    "File not found in repository: dist/app.zip",
                    "Latest release not found for repository",
                    "Release asset not found: app.zip",
                  ],
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
              },
            },
          },
        },
      },
    },
    "/downloads/git/refresh": {
      post: {
        summary: "Refresh a Git download",
        description:
          "Pull the latest changes from the GitHub repository and update the tracked file. Logs the sync result in git_sync_history.",
        operationId: "refreshGitDownload",
        tags: ["Git Downloads"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    description: "Git download ID to refresh",
                    example: "550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
              example: { id: "550e8400-e29b-41d4-a716-446655440000" },
            },
          },
        },
        responses: {
          "200": {
            description: "Git download refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    id: {
                      type: "string",
                      example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                    commitSha: {
                      type: "string",
                      description: "New commit SHA after refresh",
                      example: "a1b2c3d4e5f6...",
                    },
                    sha256: {
                      type: "string",
                      description: "SHA256 checksum of the updated file",
                      example:
                        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    },
                    changed: {
                      type: "boolean",
                      description: "Whether the file changed since last sync",
                      example: true,
                    },
                  },
                  required: ["success", "id", "commitSha", "sha256", "changed"],
                },
              },
            },
          },
          "400": {
            description: "Missing id or refresh failed",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  examples: ["Missing id", "Fetch failed: ..."],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Unauthorized" },
              },
            },
          },
          "404": {
            description: "Git download not found",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Git download '550e8400-...' not found",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
              },
            },
          },
        },
      },
    },
    "/downloads/git/history": {
      get: {
        summary: "Get sync history for a Git download",
        description:
          "Retrieve the sync history for a specific Git download, including both successful and failed sync attempts.",
        operationId: "getGitDownloadHistory",
        tags: ["Git Downloads"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            description: "Git download ID",
            schema: { type: "string", format: "uuid" },
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
        responses: {
          "200": {
            description: "List of sync history entries",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        example: "660e8400-e29b-41d4-a716-446655440001",
                      },
                      status: {
                        type: "string",
                        enum: ["success", "failed"],
                        example: "success",
                      },
                      errorMessage: {
                        type: "string",
                        nullable: true,
                        example: null,
                      },
                      previousCommitSha: {
                        type: "string",
                        nullable: true,
                        example: "a1b2c3d4e5f6...",
                      },
                      newCommitSha: {
                        type: "string",
                        nullable: true,
                        example: "b2c3d4e5f6g7...",
                      },
                      syncedAt: {
                        type: "string",
                        format: "date-time",
                        example: "2024-01-15T10:30:00Z",
                      },
                    },
                    required: ["id", "status", "syncedAt"],
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing id parameter",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Missing id" },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing API key",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Unauthorized" },
              },
            },
          },
          "404": {
            description: "Git download not found",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Git download '550e8400-...' not found",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "text/plain": {
                schema: { type: "string", example: "Internal Server Error" },
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
          availableTiers: {
            type: "array",
            items: {
              type: "string",
            },
            nullable: true,
            description:
              "Available tier names for this product. If specified, licenses require a tier from this list.",
            example: ["starter", "pro", "enterprise"],
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
            nullable: true,
            description:
              "License tier (dynamically validated against product's availableTiers)",
            example: "pro",
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
      Download: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique download entry identifier",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          productId: {
            type: "string",
            description: "Associated product identifier",
            example: "myapp",
          },
          version: {
            type: "string",
            description: "Version tag (for regular downloads)",
            example: "1.2.0",
          },
          filename: {
            type: "string",
            description: "Original filename",
            example: "myapp-1.2.0-linux-amd64.zip",
          },
          sha256: {
            type: "string",
            description: "SHA256 checksum of the file",
            example:
              "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
          github: {
            type: "boolean",
            description:
              "Whether this is a Git-based download (true) or regular upload (false)",
            example: false,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the entry was created",
            example: "2024-01-15T10:30:00Z",
          },
        },
        required: [
          "id",
          "productId",
          "filename",
          "sha256",
          "github",
          "createdAt",
        ],
      },
      GitDownload: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique git download identifier",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          productId: {
            type: "string",
            description: "Associated product identifier",
            example: "myapp",
          },
          repoUrl: {
            type: "string",
            description: "GitHub repository URL",
            example: "https://github.com/owner/repo",
          },
          filePath: {
            type: "string",
            description: "Path to file within repository",
            example: "dist/app-1.0.0.zip",
          },
          sourceType: {
            type: "string",
            description: "Git download source mode",
            enum: ["repo_file", "release_asset"],
            example: "repo_file",
          },
          assetName: {
            type: "string",
            nullable: true,
            description: "Tracked release asset filename",
            example: "app-1.0.0.zip",
          },
          releaseTag: {
            type: "string",
            nullable: true,
            description: "Latest release tag when sourceType=release_asset",
            example: "v1.0.0",
          },
          releaseId: {
            type: "string",
            nullable: true,
            description: "Latest release id when sourceType=release_asset",
            example: "123456789",
          },
          branch: {
            type: "string",
            description: "Branch name",
            example: "main",
          },
          commitSha: {
            type: "string",
            description: "Current commit SHA",
            example: "a1b2c3d4e5f6...",
          },
          filename: {
            type: "string",
            description: "Extracted filename",
            example: "app-1.0.0.zip",
          },
          sha256: {
            type: "string",
            description: "SHA256 checksum of the file",
            example:
              "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
          lastSyncAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp of last successful sync",
            example: "2024-01-15T10:30:00Z",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the entry was created",
            example: "2024-01-15T10:30:00Z",
          },
        },
        required: [
          "id",
          "productId",
          "repoUrl",
          "filePath",
          "sourceType",
          "branch",
          "commitSha",
          "filename",
          "sha256",
          "lastSyncAt",
          "createdAt",
        ],
      },
      GitSyncHistory: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "660e8400-e29b-41d4-a716-446655440001",
          },
          status: {
            type: "string",
            enum: ["success", "failed"],
            description: "Sync status",
            example: "success",
          },
          errorMessage: {
            type: "string",
            nullable: true,
            description: "Error message if sync failed",
            example: null,
          },
          previousCommitSha: {
            type: "string",
            nullable: true,
            description: "Commit SHA before sync",
            example: "a1b2c3d4e5f6...",
          },
          newCommitSha: {
            type: "string",
            nullable: true,
            description: "Commit SHA after sync",
            example: "b2c3d4e5f6g7...",
          },
          syncedAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp of sync attempt",
            example: "2024-01-15T10:30:00Z",
          },
        },
        required: ["id", "status", "syncedAt"],
      },
    },
  },
};
