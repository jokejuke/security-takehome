export interface User {
  id: string;
  handle: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPayload {
  sub: string;
  handle: string;
  type: 'access';
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

export interface JwtConfig {
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  algorithm: 'RS256';
}
