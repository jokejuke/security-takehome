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
    return this.generateToken({ id: user.id, handle: user.handle });
  }


  async signOut(accessToken: string): Promise<void> {
    try {
      const payload = jwt.verify(accessToken, this.publicKey, {
        algorithms: [this.config.jwt.algorithm],
      }) as TokenPayload;

      if (payload.exp) {
        await this.tokenBlacklist.addToken(accessToken, payload.exp * 1000);
      }
    } catch {
      // Token already invalid, nothing to blacklist
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    if (await this.tokenBlacklist.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: [this.config.jwt.algorithm],
      }) as TokenPayload;

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid access token');
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  private generateToken(user: { id: string; handle: string }): AuthTokens {
    const accessPayload: TokenPayload = {
      sub: user.id,
      handle: user.handle,
      type: 'access',
    };

    const accessToken = jwt.sign(accessPayload, this.privateKey, {
      algorithm: this.config.jwt.algorithm,
      expiresIn: this.config.jwt.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
    });

    return {
      accessToken,
      expiresIn: this.config.jwt.accessTokenExpiresIn,
    };
  }

}
