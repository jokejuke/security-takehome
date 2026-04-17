import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../common/database.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { AuthTokens, JwtConfig, TokenPayload, User } from './auth.types';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginThrottleService } from './login-throttle.service';

type UserRow = {
  id: string;
  handle: string;
  password_hash: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

interface AppConfig {
  jwt: JwtConfig;
}

@Injectable()
export class AuthService {
  private readonly config: AppConfig;
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly loginThrottle: LoginThrottleService,
  ) {
    const env = process.env.NODE_ENV || 'development';
    const configPath = join(__dirname, '..', '..', 'config', `${env}.json`);
    this.config = JSON.parse(readFileSync(configPath, 'utf-8'));

    const keysDir = join(__dirname, '..', '..', 'keys');
    this.privateKey = readFileSync(join(keysDir, 'private.pem'), 'utf-8');
    this.publicKey = readFileSync(join(keysDir, 'public.pem'), 'utf-8');
  }

  async signUp(dto: SignUpDto): Promise<{ userId: string }> {
    const existingUser = this.database.query<UserRow>(
      'SELECT id FROM users WHERE handle = $1;',
      [dto.handle],
    );
    if (existingUser.length > 0) {
      throw new ConflictException('Handle already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userId = randomUUID();
    const bioPageId = randomUUID();
    const now = new Date().toISOString();

    this.database.exec('BEGIN TRANSACTION;');
    try {
      this.database.exec(
        `INSERT INTO users (id, handle, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5);`,
        [userId, dto.handle, passwordHash, now, now],
      );

      const displayName = dto.displayName || dto.handle;
      const bio = dto.bio || '';
      const linksJson = JSON.stringify(dto.links || []);

      this.database.exec(
        `INSERT INTO bio_pages (id, user_id, handle, display_name, bio, links_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [bioPageId, userId, dto.handle, displayName, bio, linksJson, now, now],
      );
      this.database.exec('COMMIT;');
    } catch (error) {
      this.database.exec('ROLLBACK;');
      throw error;
    }

    return { userId };
  }

  async signIn(dto: SignInDto): Promise<AuthTokens> {
    const waitMs = await this.loginThrottle.getWaitTime(dto.handle);
    if (waitMs > 0) {
      const retryAfter = Math.ceil(waitMs / 1000);
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many login attempts. Try again later.', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rows = this.database.query<UserRow>(
      'SELECT * FROM users WHERE handle = $1;',
      [dto.handle],
    );
    const user = rows[0];
    if (!user) {
      await this.loginThrottle.recordFailure(dto.handle);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deleted_at) {
      throw new UnauthorizedException('Account has been deleted');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      await this.loginThrottle.recordFailure(dto.handle);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.loginThrottle.clearFailures(dto.handle);
    return this.generateTokens({ id: user.id, handle: user.handle });
  }

  /**
   * RFC 6749 §6 — Refresh an access token using a valid refresh token.
   * Implements refresh token rotation: the supplied refresh token is
   * immediately revoked and a fresh token pair is returned.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    // 1. Verify signature and expiry
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, this.publicKey, {
        algorithms: [this.config.jwt.algorithm],
      }) as TokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Must carry type: 'refresh' — reject access tokens used as refresh tokens
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // 3. Check revocation list (covers logout and prior rotation)
    if (await this.tokenBlacklist.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // 4. Ensure user still exists and is active
    const rows = this.database.query<UserRow>(
      'SELECT id, handle, deleted_at FROM users WHERE id = $1;',
      [payload.sub],
    );
    const user = rows[0];
    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found or account deleted');
    }

    // 5. Rotate: revoke the consumed refresh token immediately (RFC 6749 §10.4)
    if (payload.exp) {
      await this.tokenBlacklist.addToken(payload.jti, payload.exp * 1000);
    }

    // 6. Issue fresh token pair
    return this.generateTokens({ id: user.id, handle: user.handle });
  }

  /**
   * Revoke the current session by blacklisting both the access token and,
   * when provided, the refresh token.
   */
  async signOut(accessToken: string, refreshToken?: string): Promise<void> {
    await this.revokeToken(accessToken);
    if (refreshToken) {
      await this.revokeToken(refreshToken);
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, this.publicKey, {
        algorithms: [this.config.jwt.algorithm],
      }) as TokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (await this.tokenBlacklist.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return payload;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Verify a token's signature and blacklist it by its `jti`.
   * Silently ignores already-expired or malformed tokens.
   */
  private async revokeToken(token: string): Promise<void> {
    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: [this.config.jwt.algorithm],
      }) as TokenPayload;

      if (payload.jti && payload.exp) {
        await this.tokenBlacklist.addToken(payload.jti, payload.exp * 1000);
      }
    } catch {
      // Token already invalid — nothing to blacklist
    }
  }

  /**
   * Issue an access + refresh token pair (RFC 6749 §5.1).
   * Both tokens carry a unique `jti` (RFC 7519 §4.1.7) for per-token revocation.
   */
  private generateTokens(user: { id: string; handle: string }): AuthTokens {
    const accessPayload: TokenPayload = {
      sub: user.id,
      handle: user.handle,
      type: 'access',
      jti: randomUUID(),
    };

    const refreshPayload: TokenPayload = {
      sub: user.id,
      handle: user.handle,
      type: 'refresh',
      jti: randomUUID(),
    };

    const accessToken = jwt.sign(accessPayload, this.privateKey, {
      algorithm: this.config.jwt.algorithm,
      expiresIn: this.config.jwt.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(refreshPayload, this.privateKey, {
      algorithm: this.config.jwt.algorithm,
      expiresIn: this.config.jwt.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
    });

    return {
      accessToken,
      accessExpiresIn: this.config.jwt.accessTokenExpiresIn,
      refreshToken,
      refreshExpiresIn: this.config.jwt.refreshTokenExpiresIn,
    };
  }
}
