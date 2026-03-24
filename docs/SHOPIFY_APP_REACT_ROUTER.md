# Shopify App React Router

Use this guide if your app is built with [`@shopify/shopify-app-react-router`](https://shopify.dev/docs/api/shopify-app-react-router) (Shopify CLI React Router template).

## Problem

`shopify.authenticate.admin(request)` decodes the session JWT, loads a session from your configured storage, and may call Shopify’s token exchange when no session exists. Mock Bridge issues embedded session JWTs for local testing; when those tokens are signed with your real app secret, decoding succeeds, but Shopify will not exchange a mock-issued token. Without a row in session storage, admin authentication fails (redirect or error).

## Solution

When `SHOPIFY_MOCK_BRIDGE_AUTH=1`, wrap **only** `authenticate.admin` with `withMockBridgeAdminAuthForReactRouter` from `@getverdict/mock-bridge/react-router`. It decodes the session token using `@shopify/shopify-api` (same audience checks as the framework), seeds a minimal offline or online `Session` if needed, then calls the real `shopify.authenticate.admin(request)`. Webhooks and other `authenticate.*` methods are unchanged.

## Environment variables

| Variable | When | Purpose |
| -------- | ---- | ------- |
| `SHOPIFY_MOCK_BRIDGE_AUTH` | E2E / CI only | Must be `"1"` for the wrapper to seed a session before delegating to `authenticate.admin`. |
| `SHOPIFY_MOCK_BRIDGE_ACCESS_TOKEN` | Optional | If set, stored on the seeded session as `accessToken` so tests that call the real Admin API can use a valid token. |

**Never set `SHOPIFY_MOCK_BRIDGE_AUTH` in production.** It bypasses normal session acquisition for admin requests when enabled.

## Align JWT verification with the mock server

`MockShopifyAdminServer` must sign session tokens with the **same secret** your app uses for JWT verification: set `clientSecret` to your app’s `SHOPIFY_API_SECRET` / `apiSecretKey` when you rely on that signing path. Otherwise `decodeSessionToken` will reject mock tokens.

## `shopify.server.ts` example

After `const shopify = shopifyApp({ ... })`, export `authenticate` like this (mirror the same `apiKey`, `apiSecretKey`, `apiVersion`, `scopes`, `appUrl`, and `customShopDomains` as `shopifyApp`):

```typescript
import { shopifyApp, ApiVersion } from "@shopify/shopify-app-react-router/server";
import { withMockBridgeAdminAuthForReactRouter } from "@getverdict/mock-bridge/react-router";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(",") ?? [],
  appUrl: process.env.SHOPIFY_APP_URL!,
  // sessionStorage, authPathPrefix, etc.
});

export default shopify;

export const authenticate =
  process.env.SHOPIFY_MOCK_BRIDGE_AUTH === "1"
    ? withMockBridgeAdminAuthForReactRouter(shopify, {
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET!,
        apiVersion: ApiVersion.October25,
        scopes: process.env.SCOPES?.split(",") ?? [],
        appUrl: process.env.SHOPIFY_APP_URL!,
      })
    : shopify.authenticate;
```

Set `useOnlineTokens: true` in the reflect config if your app uses online tokens and you need the same session id strategy as production.

## App Bridge and CSP

Point embedded App Bridge at your mock server and relax CSP for the mock admin origin in development, similar to the Remix guide:

- See [Shopify app remix](./SHOPIFY_APP_REMIX.md) for the `__APP_BRIDGE_URL` and `frame-ancestors` patterns (adjust host/port if yours differ).

## Runtime dependency

The `@getverdict/mock-bridge/react-router` implementation loads **`@shopify/shopify-api` only** at runtime (for `shopifyApi`, `Session`, and `decodeSessionToken`). Your app must still install **`@shopify/shopify-app-react-router`** and peers (`react`, `react-dom`, `react-router`) as required by Shopify’s template.

## Install from npm or Git

```bash
npm install @getverdict/mock-bridge --save-dev
# or a branch:
# "@getverdict/mock-bridge": "github:bevycommerce/mock-bridge#feature/react-router-admin-auth"
```

## Related

- [Backend integration](./BACKEND_INTEGRATION.md) — token-string validators and `withMockTokenSupport` (not a substitute for `authenticate.admin(request)`).
