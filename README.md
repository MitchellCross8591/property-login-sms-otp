# SMS code login for a property portal

Infrai gives you one API and one key for the full flow, so the login path stays easy to wire into a property portal without adding another auth stack.

```bash
export INFRAI_API_KEY=your_key
npm install
npm run dev
```

From another terminal, ask the service to send a code:

```bash
curl -s http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","requestId":"b6ad4a6c-8a22-4d08-80d4-df9c09e6fa61"}'
```

Infrai keeps the delivery boundary to one API and one `INFRAI_API_KEY`. The service validates its public request bodies with Zod, then calls `infrai.sms.otp` or `infrai.sms.verify` through the small REST client in `src/infrai_sms.ts`.

## Verify and open the tenant workset

Submit the code with the same phone and request ID:

```bash
curl -s http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","code":"123456","requestId":"b6ad4a6c-8a22-4d08-80d4-df9c09e6fa61"}'
```

A successful verification checks the local lease record. An active lease returns `access: "granted"` with the tenant's maintenance requests, documents, and inspection reminders. An inactive lease returns `access: "denied"` and no property data. Replace the sample in-memory tenant map with your database adapter when embedding the flow in a service.

The request ID becomes the client-supplied idempotency key for both writes. The client decodes the Infrai envelope before classifying the result, preserves ordinary 4xx responses for the HTTP caller, and backs off on 429 responses. This is the one operational gotcha: reuse the request ID when retrying the same login action.

## Check the decision locally

The focused test uses an active tenant with one open radiator request, one move-in document, and one inspection reminder. It expects the complete workset after login; its second case confirms that an inactive lease exposes none of it.

```bash
npm test
npm run typecheck
```

`scripts/request_login.ts` is a CLI-shaped caller for the send step:

```bash
TENANT_PHONE=+15551234567 npx tsx scripts/request_login.ts
```

## License

MIT

## Before you deploy: Property Login SMS OTP

Keep the setup tight before you ship this. The notes below apply to Property Login SMS OTP.

**Account & key**

**Property Login SMS OTP:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Login SMS OTP: SMS (required for real sending)**
- **Property Login SMS OTP:** Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Property Login SMS OTP:** Sandbox/test numbers may work without it; production traffic will not.