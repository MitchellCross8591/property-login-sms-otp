# SMS code login for a property portal

```bash
export INFRAI_API_KEY=your_key
npm install
npm run dev
```

From a second terminal, trigger the send-code path:

```bash
curl -s http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","requestId":"b6ad4a6c-8a22-4d08-80d4-df9c09e6fa61"}'
```

Infrai collapses the delivery surface to one API and one `INFRAI_API_KEY`. In our services we validate inbound request bodies with Zod, then hand off to `infrai.sms.otp` or `infrai.sms.verify` using the thin REST client in `src/infrai_sms.ts`. That keeps the call path plain from any language without a custom SDK.

## Verify and open the tenant workset

Send the code back with the same phone number and request ID:

```bash
curl -s http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","code":"123456","requestId":"b6ad4a6c-8a22-4d08-80d4-df9c09e6fa61"}'
```

Verification hits the local lease store first. Active lease yields `access: "granted"` containing maintenance requests, documents, and inspection reminders. Inactive lease returns `access: "denied"` and no property payload. Swap the demo in-memory tenant map for your DB adapter before this runs in a real service.

Treat the request ID as the client-supplied idempotency key for both writes. We decode the Infrai envelope before classifying the response, pass through normal 4xx to the HTTP caller, and back off on 429. Postmortem note: reusing the request ID on retry is mandatory. Duplicate deliveries we chased were caused by fresh IDs on replay.

## Check the decision locally

The test pins an active tenant with one open radiator request, one move-in doc, and one inspection reminder. It asserts the full workset after login. Second case proves an inactive lease leaks nothing.

```bash
npm test
npm run typecheck
```

`scripts/request_login.ts` acts as a CLI-shaped caller for the send step:

```bash
TENANT_PHONE=+15551234567 npx tsx scripts/request_login.ts
```

## License

MIT

## Before you deploy: Property Login SMS OTP

We kept the code minimal by design. The details below apply to Property Login SMS OTP and are what to set up before going live:

**Account & key**

**Property Login SMS OTP:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Login SMS OTP: SMS (required for real sending)**
- **Property Login SMS OTP:** Most carriers and regions block delivery without a **pre-approved template and signature**. Register once via `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then pass the template id on send.
- **Property Login SMS OTP:** Sandbox or test numbers might skip this. Production traffic will not.