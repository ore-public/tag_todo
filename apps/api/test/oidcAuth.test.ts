import { SignJWT, generateKeyPair } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/http/app";
import { testDb } from "./database";

// Cognito の代わりに応答する偽の認証基盤
const ISSUER = "https://cognito.test/pool";
const AUTH_DOMAIN = "https://auth.test";
const CLIENT_ID = "test-client";
const ORIGIN = "https://todo.example.com";
const { privateKey } = await generateKeyPair("RS256");

const app = createApp({
  db: testDb,
  config: {
    publicOrigin: ORIGIN,
    corsOrigins: [],
    auth: {
      kind: "oidc",
      oidc: {
        issuer: ISSUER,
        clientId: CLIENT_ID,
        clientSecret: "test-secret",
        // テスト用の署名鍵（ライブラリの要件の 32 文字）
        sessionSecret: "x".repeat(32),
        logoutEndpoint: `${AUTH_DOMAIN}/logout`,
      },
    },
  },
});

interface FakeCognito {
  email: string;
  nonce: string | undefined;
  revoked: string[];
}

function installFakeCognito(): FakeCognito {
  const state: FakeCognito = { email: `user-${crypto.randomUUID()}@example.com`, nonce: undefined, revoked: [] };
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === `${ISSUER}/.well-known/openid-configuration`) {
      return Response.json({
        issuer: ISSUER,
        authorization_endpoint: `${AUTH_DOMAIN}/oauth2/authorize`,
        token_endpoint: `${AUTH_DOMAIN}/oauth2/token`,
        revocation_endpoint: `${AUTH_DOMAIN}/oauth2/revoke`,
        jwks_uri: `${ISSUER}/.well-known/jwks.json`,
        scopes_supported: ["openid", "email", "profile"],
        response_types_supported: ["code"],
        id_token_signing_alg_values_supported: ["RS256"],
      });
    }
    if (url === `${AUTH_DOMAIN}/oauth2/token`) {
      const idToken = await new SignJWT({ email: state.email, nonce: state.nonce })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuer(ISSUER)
        .setAudience(CLIENT_ID)
        .setSubject(`sub-${state.email}`)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);
      return Response.json({
        access_token: "access",
        id_token: idToken,
        refresh_token: "refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    if (url === `${AUTH_DOMAIN}/oauth2/revoke`) {
      state.revoked.push(init?.body instanceof URLSearchParams ? init.body.toString() : "");
      return new Response(null, { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });
  return state;
}

/** Set-Cookie ヘッダーから、名前と値の組を取り出す */
function cookiesOf(res: Response): Record<string, string> {
  return Object.fromEntries(
    res.headers.getSetCookie().map((cookie) => {
      const [pair = ""] = cookie.split(";");
      const index = pair.indexOf("=");
      return [pair.slice(0, index), pair.slice(index + 1)];
    }),
  );
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

/** ログイン画面へ転送されてから、ログインして戻ってくるまでを行い、セッションの Cookie を返す */
async function login(cognito: FakeCognito): Promise<string> {
  const loginRes = await app.request(`${ORIGIN}/auth/login`);
  const flowCookies = cookiesOf(loginRes);
  cognito.nonce = flowCookies.nonce;
  const callbackRes = await app.request(`${ORIGIN}/auth/callback?code=test-code&state=${flowCookies.state ?? ""}`, {
    headers: { Cookie: cookieHeader(flowCookies) },
  });
  expect(callbackRes.status).toBe(302);
  const session = cookiesOf(callbackRes).tagtodo_session;
  if (!session) throw new Error("セッションの Cookie が発行されていません");
  return `tagtodo_session=${session}`;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Cognito でのログイン", () => {
  it("/auth/login は PKCE を使って Cognito のログイン画面へ転送する", async () => {
    installFakeCognito();

    const res = await app.request(`${ORIGIN}/auth/login`);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("Location") ?? "");
    expect(location.origin + location.pathname).toBe(`${AUTH_DOMAIN}/oauth2/authorize`);
    expect(location.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(location.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/auth/callback`);
    expect(location.searchParams.get("scope")).toBe("openid email");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(Object.keys(cookiesOf(res))).toEqual(expect.arrayContaining(["state", "nonce", "code_verifier"]));
  });

  it("ログインするとセッションの Cookie が発行され、そのユーザーとして API を使える", async () => {
    const cognito = installFakeCognito();
    const session = await login(cognito);

    const res = await app.request(`${ORIGIN}/api/me`, { headers: { Cookie: session } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: cognito.email });
  });

  it("ログイン済みで /auth/login を開くと、トップへ戻る", async () => {
    const session = await login(installFakeCognito());

    const res = await app.request(`${ORIGIN}/auth/login`, { headers: { Cookie: session } });

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
  });

  it("ログインしていなければ、転送せずに 401 を返す", async () => {
    installFakeCognito();
    const res = await app.request(`${ORIGIN}/api/me`);
    expect(res.status).toBe(401);
  });

  it("改ざんしたセッションの Cookie は受け付けない", async () => {
    const session = await login(installFakeCognito());
    const res = await app.request(`${ORIGIN}/api/me`, { headers: { Cookie: `${session}x` } });
    expect(res.status).toBe(401);
  });

  it("開発モード用のヘッダーは使えない", async () => {
    installFakeCognito();
    const res = await app.request(`${ORIGIN}/api/me`, { headers: { "X-Dev-User-Email": "dev@example.com" } });
    expect(res.status).toBe(401);
  });

  it("30日たつとセッションが切れる", async () => {
    const session = await login(installFakeCognito());

    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    const res = await app.request(`${ORIGIN}/api/me`, { headers: { Cookie: session } });

    expect(res.status).toBe(401);
  });

  it("ログアウトするとリフレッシュトークンを失効させ、Cognito のログアウトへ転送する", async () => {
    const cognito = installFakeCognito();
    const session = await login(cognito);

    const res = await app.request(`${ORIGIN}/auth/logout`, { headers: { Cookie: session } });

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("Location") ?? "");
    expect(location.origin + location.pathname).toBe(`${AUTH_DOMAIN}/logout`);
    expect(location.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(location.searchParams.get("logout_uri")).toBe(`${ORIGIN}/`);
    expect(cognito.revoked).toHaveLength(1);
    expect(cookiesOf(res).tagtodo_session).toBe("");
  });

  it("ログインに失敗したときは、もう一度ログインするためのページを返す", async () => {
    installFakeCognito();

    const res = await app.request(`${ORIGIN}/auth/callback?error=access_denied&state=x`);

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('<a href="/auth/login">');
  });
});
