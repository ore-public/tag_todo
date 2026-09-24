import { env } from "cloudflare:workers";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { describe, expect, it } from "vitest";
import { app } from "../src/http/app";
import { verifyAccessJwt } from "../src/usecases/access";
import { uniqueUser, webApi } from "./helpers";

const config = { teamDomain: "team.cloudflareaccess.com", audience: "test-aud" };
const { privateKey, publicKey } = await generateKeyPair("RS256");
const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256" }] });

function signJwt(claims: Record<string, unknown>, overrides: { issuer?: string; audience?: string } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(overrides.issuer ?? `https://${config.teamDomain}`)
    .setAudience(overrides.audience ?? config.audience)
    .setExpirationTime("1h")
    .sign(privateKey);
}

describe("verifyAccessJwt", () => {
  it("正しい JWT ならメールアドレスを返す", async () => {
    const token = await signJwt({ email: "alice@example.com" });
    expect(await verifyAccessJwt(token, config, keys)).toBe("alice@example.com");
  });

  it.each([
    ["aud が違う", { email: "a@example.com" }, { audience: "other" }],
    ["発行元が違う", { email: "a@example.com" }, { issuer: "https://other.cloudflareaccess.com" }],
    ["email がない", {}, {}],
  ])("%s JWT は拒否する", async (_, claims, overrides) => {
    const token = await signJwt(claims, overrides);
    await expect(verifyAccessJwt(token, config, keys)).rejects.toMatchObject({ code: "unauthorized" });
  });
});

describe("Access 認証（本番の設定）", () => {
  const productionEnv = { ...env, ACCESS_AUD: "test-aud", ACCESS_TEAM_DOMAIN: config.teamDomain };

  it("Cf-Access-Jwt-Assertion ヘッダーがなければ 401", async () => {
    const res = await app.request("/api/todos", {}, productionEnv);
    expect(res.status).toBe(401);
  });

  it("ACCESS_AUD が設定されていれば開発用ヘッダーは無視する", async () => {
    const res = await app.request("/api/todos", { headers: { "X-Dev-User-Email": "a@example.com" } }, productionEnv);
    expect(res.status).toBe(401);
  });
});

describe("/api/me", () => {
  it("ログイン中のメールアドレスを小文字にして返す", async () => {
    const user = uniqueUser();
    const res = await webApi(user.toUpperCase(), "/me");
    expect(await res.json()).toEqual({ email: user });
  });
});

describe("存在しない API", () => {
  it("404 を JSON で返す", async () => {
    const res = await webApi(uniqueUser(), "/unknown");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "not_found" } });
  });
});
