import {
  ConflictException,
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
import { AuthTokens, JwtConfig, TokenPayload, User, RefreshToken } from './auth.types';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

type RefreshTokenRow = {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
};

interface AppConfig {
  jwt: JwtConfig;
}

@Injectable()
export class AuthService {
  private readonly config: AppConfig;
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(private readonly database: DatabaseService) {
    const env = process.env.NODE_ENV || 'development';
    const configPath = join(__dirname, '..', '..', 'config', `${env}.json`);
    this.config = JSON.parse(readFileSync(configPath, 'utf-8'));

    const keysDir = join(__dirname, '..', '..', 'keys');
    this.privateKey = readFileSync(join(keysDir, 'private.pem'), 'utf-8');
    this.publicKey = readFileSync(join(keysDir, 'public.pem'), 'utf-8');

    this.initTables();
  }

  private initTables(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.database.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  async signUp(dto: SignUpDto): Promise<AuthTokens> {
    const existingUser = this.database.query<UserRow>(
      'SELECT id FROM users WHERE email = $1;',
      [dto.email],
    );
    if (existingUser.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.database.exec(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [id, dto.email, passwordHash, now, now],
    );

    return this.generateTokens({ id, email: dto.email });
  }

  async signIn(dto: SignInDto): Promise<AuthTokens> {
    const rows = this.database.query<UserRow>(
      'SELECT * FROM users WHERE email = $1;',
      [dto.email],
    );
    const user = rows[0];
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens({ id: user.id, email: user.email });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, this.publicKey, {
        algorithms: [this.config.jwt.algorithm],
      }) as TokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const tokenRows = this.database.query<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE token = $1;',
      [refreshToken],
    );
    const storedToken = tokenRows[0];
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      this.database.exec('DELETE FROM refresh_tokens WHERE id = $1;', [storedToken.id]);
      throw new UnauthorizedException('Refresh token expired');
    }

    this.database.exec('DELETE FROM refresh_tokens WHERE id = $1;', [storedToken.id]);

    const userRows = this.database.query<UserRow>(
      'SELECT * FROM users WHERE id = $1;',
      [payload.sub],
    );
    const user = userRows[0];
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens({ id: user.id, email: user.email });
  }

  async signOut(refreshToken: string): Promise<void> {
    this.database.exec('DELETE FROM refresh_tokens WHERE token = $1;', [refreshToken]);
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: [this.config.jwt.algorithm],
      }) as TokenPayload;

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  private generateTokens(user: { id: string; email: string }): AuthTokens {
    const accessPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, this.privateKey, {
      algorithm: this.config.jwt.algorithm,
      expiresIn: this.config.jwt.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(refreshPayload, this.privateKey, {
      algorithm: this.config.jwt.algorithm,
      expiresIn: this.config.jwt.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
    });

    const refreshExpiresAt = this.calculateExpiry(this.config.jwt.refreshTokenExpiresIn);
    const tokenId = randomUUID();
    const now = new Date().toISOString();

    this.database.exec(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [tokenId, user.id, refreshToken, refreshExpiresAt, now],
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwt.accessTokenExpiresIn,
    };
  }

  private calculateExpiry(duration: string): string {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'd':
        now.setDate(now.getDate() + value);
        break;
    }

    return now.toISOString();
  }
}
