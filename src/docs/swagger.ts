// src/docs/swagger.ts
import type { OpenAPIV3_1 } from "openapi-types"

export const swaggerSpec: OpenAPIV3_1.Document = {
  openapi: "3.0.3",
  info: { title: "NG Fuel Prices API", version: "1.0.0" },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Problem: {
        type: "object",
        properties: {
          type: { type: "string", example: "about:blank" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          instance: { type: "string" },
          correlation_id: { type: "string" }
        }
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 120 },
          has_next: { type: "boolean", example: true }
        }
      },
      Meta: { type: "object", properties: { generated_at: { type: "string", format: "date-time" } } },
      PriceItem: {
        type: "object",
        properties: {
          station_id: { type: "string" },
          station_name: { type: "string" },
          brand: { type: "string" },
          state: { type: "string" },
          lga: { type: "string" },
          product_type: { type: "string", enum: ["PMS","AGO","DPK","CNG"] },
          price_per_liter: { type: "number" },
          currency: { type: "string" },
          effective_from: { type: "string", format: "date-time" },
          source: { type: "string" },
          is_admin_override: { type: "boolean" },
          last_updated: { type: "string", format: "date-time" }
        }
      },
      PriceCreate: {
        type: "object",
        required: ["station_id","product_type","price_per_liter","effective_from","source"],
        properties: {
          station_id: { type: "string" },
          product_type: { type: "string", enum: ["PMS","AGO","DPK","CNG"] },
          price_per_liter: { type: "number" },
          effective_from: { type: "string", format: "date-time" },
          source: { type: "string" },
          reason: { type: "string" },
          is_admin_override: { type: "boolean" },
          attachment_url: { type: "string" }
        }
      },
      PriceListResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/PriceItem" } },
          pagination: { $ref: "#/components/schemas/Pagination" },
          meta: { $ref: "#/components/schemas/Meta" }
        }
      },
      BulkReport: {
        type: "object",
        properties: {
          total: { type: "integer", example: 120 },
          valid: { type: "integer", example: 118 },
          invalid: { type: "integer", example: 2 },
          created: { type: "integer", example: 118 },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                row: { type: "integer", example: 7 },
                issues: { type: "array", items: { type: "object" } }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    "/ready": {
      get: {
        summary: "Readiness",
        responses: {
          "200": { description: "Ready" },
          "503": { description: "Not ready", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },
    "/metrics": { get: { summary: "Prometheus metrics", responses: { "200": { description: "OK" } } } },

    "/fuelprice/auth/register": {
      post: {
        summary: "Register",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["name","email","password"], properties: { name:{type:"string"}, email:{type:"string"}, password:{type:"string"} } } } }
        },
        responses: {
          "201": { description: "Created" },
          "409": { description: "Email exists", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },
    "/fuelprice/auth/verify": {
      post: {
        summary: "Verify email",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required:["token"], properties: { token:{type:"string"} } } } } },
        responses: {
          "200": { description: "OK" },
          "400": { description: "Bad token", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },
    "/fuelprice/auth/login": {
      post: {
        summary: "Login",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email","password"], properties: { email:{type:"string"}, password:{type:"string"} } } } } },
        responses: {
          "200": { description: "Tokens" },
          "401": { description: "Invalid credentials", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          "403": { description: "Email not verified", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },
    "/fuelprice/auth/refresh": {
      post: {
        summary: "Refresh",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required:["refresh_token"], properties: { refresh_token:{type:"string"} } } } } },
        responses: {
          "200": { description: "New tokens" },
          "401": { description: "Invalid or reused token", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },
    "/fuelprice/auth/logout": {
      post: {
        summary: "Logout",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required:["refresh_token"], properties: { refresh_token:{type:"string"} } } } } },
        responses: { "204": { description: "No Content" } }
      }
    },

    "/fuelprice/prices": {
      get: {
        summary: "List latest prices",
        parameters: [
          { name: "product_type", in: "query", schema: { type: "string", enum: ["PMS","AGO","DPK","CNG"] } },
          { name: "state", in: "query", schema: { type: "string" } },
          { name: "lga", in: "query", schema: { type: "string" } },
          { name: "brand", in: "query", schema: { type: "string" } },
          { name: "station_id", in: "query", schema: { type: "string" } },
          { name: "sort", in: "query", schema: { type: "string", example: "-price_per_liter" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/PriceListResponse" } } } }
        }
      },
      post: {
        summary: "Create price",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PriceCreate" } } } },
        responses: {
          "201": { description: "Created" },
          "401": { description: "Unauthorized", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          "403": { description: "Forbidden", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },

    "/fuelprice/prices/bulk": {
      post: {
        summary: "Bulk price upload",
        description: "CSV columns: station_id, product_type, price_per_liter, effective_from, reason, source, attachment_url",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "dry_run", in: "query", schema: { type: "boolean", default: false } }
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
                required: ["file"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Dry run report", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/BulkReport" } } } } } },
          "201": { description: "Created", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/BulkReport" } } } } } },
          "400": { description: "Validation error", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          "401": { description: "Unauthorized", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          "403": { description: "Forbidden", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },

    "/fuelprice/prices/{priceId}": {
      patch: {
        summary: "Update future-effective price",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "priceId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PriceCreate" } } } },
        responses: {
          "200": { description: "Updated" },
          "404": { description: "Not found", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          "409": { description: "Only future-effective updatable", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },

    "/fuelprice/prices/{stationId}/history": {
      get: {
        summary: "Price history",
        parameters: [
          { name: "stationId", in: "path", required: true, schema: { type: "string" } },
          { name: "product_type", in: "query", schema: { type: "string", enum: ["PMS","AGO","DPK","CNG"] } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: { "200": { description: "OK" } }
      }
    },

    "/fuelprice/stations": {
      get: {
        summary: "List stations",
        parameters: [
          { name: "state", in: "query", schema: { type: "string" } },
          { name: "lga", in: "query", schema: { type: "string" } },
          { name: "brand", in: "query", schema: { type: "string" } },
          { name: "services", in: "query", schema: { type: "string", example: "car_wash,atm" } },
          { name: "lat", in: "query", schema: { type: "number" } },
          { name: "lng", in: "query", schema: { type: "number" } },
          { name: "radius_km", in: "query", schema: { type: "number", example: 5 } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: { "200": { description: "OK" } }
      },
      post: {
        summary: "Create station",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } }
      }
    },

    "/fuelprice/stations/{id}": {
      patch: {
        summary: "Update station",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Updated" },
          "404": { description: "Not found", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } }
        }
      }
    },

    "/fuelprice/stats/summary": {
      get: {
        summary: "State and national averages",
        parameters: [{ name: "product_type", in: "query", schema: { type: "string", enum: ["PMS","AGO","DPK","CNG"] } }],
        responses: { "200": { description: "OK" } }
      }
    }
  }
}
