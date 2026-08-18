import { z } from "zod";

export const sendCodeBody = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  requestId: z.string().uuid(),
}).strict();

export const verifyCodeBody = sendCodeBody.extend({
  code: z.string().regex(/^\d{4,8}$/),
});

export type TenantRecord = {
  tenantId: string;
  phone: string;
  leaseActive: boolean;
  maintenanceRequests: Array<{
    id: string;
    summary: string;
    status: "open" | "scheduled" | "closed";
  }>;
  documents: Array<{
    id: string;
    name: string;
    updatedAt: string;
  }>;
  inspectionReminders: Array<{
    id: string;
    dueAt: string;
    property: string;
  }>;
};

export type PropertySession = {
  tenantId: string;
  maintenanceRequests: TenantRecord["maintenanceRequests"];
  documents: TenantRecord["documents"];
  inspectionReminders: TenantRecord["inspectionReminders"];
};

export function openPropertySession(
  tenant: TenantRecord | undefined,
): { access: "granted"; session: PropertySession } | { access: "denied"; reason: string } {
  if (!tenant) return { access: "denied", reason: "tenant_not_found" };
  if (!tenant.leaseActive) return { access: "denied", reason: "inactive_lease" };

  return {
    access: "granted",
    session: {
      tenantId: tenant.tenantId,
      maintenanceRequests: tenant.maintenanceRequests,
      documents: tenant.documents,
      inspectionReminders: tenant.inspectionReminders,
    },
  };
}
