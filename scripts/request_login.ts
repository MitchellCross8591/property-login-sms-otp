export {};

const base = process.env.PROPERTY_LOGIN_URL ?? "http://localhost:3000";
const phone = process.env.TENANT_PHONE;

if (!phone) throw new Error("TENANT_PHONE is required");

const requestId = crypto.randomUUID();
const response = await fetch(`${base}/login/code`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ phone, requestId }),
});

console.log(JSON.stringify(await response.json(), null, 2));
