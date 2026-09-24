import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { AppError } from "./errors";

export interface AccessConfig {
  teamDomain: string;
  audience: string;
}

const jwksCache = new Map<string, JWTVerifyGetKey>();

function remoteJwks(teamDomain: string): JWTVerifyGetKey {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

/**
 * Cloudflare Access が付与した JWT を検証し、メールアドレスを返す。
 * keys はテストで差し替えるためのもの。省略時はチームの公開鍵を取得する。
 */
export async function verifyAccessJwt(
  token: string,
  config: AccessConfig,
  keys: JWTVerifyGetKey = remoteJwks(config.teamDomain),
): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://${config.teamDomain}`,
      audience: config.audience,
    });
    if (typeof payload.email !== "string") throw new Error("email がありません");
    return payload.email;
  } catch {
    throw new AppError("unauthorized", "Access の認証情報が無効です");
  }
}
