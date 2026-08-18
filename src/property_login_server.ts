import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { infrai, InfraiError } from "./infrai_sms.js";
import {
  openPropertySession,
  sendCodeBody,
  type TenantRecord,
  verifyCodeBody,
} from "./property_access.js";

const tenants = new Map<string, TenantRecord>([
  ["+15551234567", {
    tenantId: "tenant-42",
    phone: "+15551234567",
    leaseActive: true,
    maintenanceRequests: [
      { id: "maint-104", summary: "Kitchen faucet leak", status: "scheduled" },
    ],
    documents: [
      { id: "doc-lease-42", name: "Current lease", updatedAt: "2026-07-01" },
    ],
    inspectionReminders: [
      { id: "inspect-8", dueAt: "2026-09-10T09:00:00Z", property: "Unit 4B" },
    ],
  }],
]);

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function clientStatus(error: InfraiError): number {
  if (error.status >= 400 && error.status < 500) return error.status;
  return 502;
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST") {
    json(response, 405, { error: "method_not_allowed" });
    return;
  }

  try {
    const raw = await readJson(request);

    if (request.url === "/login/code") {
      const body = sendCodeBody.parse(raw);
      await infrai.sms.otp({ to: body.phone, idempotency_key: body.requestId });
      json(response, 202, { status: "code_sent", requestId: body.requestId });
      return;
    }

    if (request.url === "/login/verify") {
      const body = verifyCodeBody.parse(raw);
      await infrai.sms.verify({
        to: body.phone,
        code: body.code,
        idempotency_key: body.requestId,
      });
      const decision = openPropertySession(tenants.get(body.phone));
      json(response, decision.access === "granted" ? 200 : 403, decision);
      return;
    }

    json(response, 404, { error: "route_not_found" });
  } catch (error) {
    if (error instanceof InfraiError) {
      json(response, clientStatus(error), { error: error.detail });
      return;
    }
    if (error instanceof z.ZodError) {
      json(response, 400, { error: "invalid_request", issues: error.issues });
      return;
    }
    json(response, 500, { error: "request_failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`property login listening on http://localhost:${port}`));
