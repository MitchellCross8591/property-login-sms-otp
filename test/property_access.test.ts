import assert from "node:assert/strict";
import test from "node:test";
import { openPropertySession, type TenantRecord } from "../src/property_access.js";

const tenant: TenantRecord = {
  tenantId: "tenant-7",
  phone: "+15550001111",
  leaseActive: true,
  maintenanceRequests: [
    { id: "maint-7", summary: "Bedroom radiator", status: "open" },
  ],
  documents: [
    { id: "doc-7", name: "Move-in report", updatedAt: "2026-08-01" },
  ],
  inspectionReminders: [
    { id: "inspection-7", dueAt: "2026-09-01T10:00:00Z", property: "Unit 7" },
  ],
};

test("an active lease opens the tenant's exact property workset", () => {
  const decision = openPropertySession(tenant);

  assert.equal(decision.access, "granted");
  if (decision.access === "granted") {
    assert.equal(decision.session.maintenanceRequests[0]?.status, "open");
    assert.equal(decision.session.documents[0]?.name, "Move-in report");
    assert.equal(decision.session.inspectionReminders[0]?.property, "Unit 7");
  }
});

test("a verified phone with an inactive lease gets no property data", () => {
  const decision = openPropertySession({ ...tenant, leaseActive: false });

  assert.deepEqual(decision, { access: "denied", reason: "inactive_lease" });
});
