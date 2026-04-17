export interface User {
  id: string;
  handle: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * JWT payload following RFC 7519 registered claims plus app-specific claims.
 * `jti` (JWT ID) uniquely identifies each token and is used for revocation.
 */
export interface TokenPayload {
  sub: string;               // RFC 7519: subject (user id)
  handle: string;            // app claim: user handle
  type: 'access' | 'refresh'; // discriminates token purpose
  jti: string;               // RFC 7519: unique token ID (UUID v4) for blacklisting
  exp?: number;              // RFC 7519: expiration time (unix seconds)
}

/**
 * Token pair returned on sign-in and token refresh (RFC 6749 §5.1).
 */
export interface AuthTokens {
  accessToken: string;
  accessExpiresIn: string;
  refreshToken: string;
  refreshExpiresIn: string;
}

export interface JwtConfig {
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  algorithm: 'RS256';
}
