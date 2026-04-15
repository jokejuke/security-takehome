import { Injectable } from '@nestjs/common';
import { newDb, replaceQueryArgs$ } from 'pg-mem';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';

interface DatabaseConfig {
  database: {
    type: 'sqlite' | 'postgres' | 'pg-mem';
    path?: string;
    connectionString?: string;
  };
}

@Injectable()
export class DatabaseService {
  private readonly pgDb: ReturnType<typeof newDb> | null = null;
  private readonly sqliteDb: Database.Database | null = null;
  private readonly dbType: 'sqlite' | 'postgres' | 'pg-mem';
  private initialized = false;

  constructor() {
    const env = process.env.NODE_ENV || 'development';
    const configPath = join(__dirname, '..', '..', 'config', `${env}.json`);
    const config: DatabaseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    this.dbType = config.database.type;

    if (this.dbType === 'sqlite') {
      this.sqliteDb = new Database(config.database.path || ':memory:');
    } else if (this.dbType === 'pg-mem' || this.dbType === 'postgres') {
      this.pgDb = newDb();
    }

    this.initSchema();
  }

  private initSchema(): void {
    const createUsers = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        handle TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;

    const createBioPages = `
      CREATE TABLE IF NOT EXISTS bio_pages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        handle TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        bio TEXT NOT NULL,
        links_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;

    const createSharing = `
      CREATE TABLE IF NOT EXISTS sharing (
        id TEXT PRIMARY KEY,
        owner_handle TEXT NOT NULL,
        shared_handle TEXT NOT NULL,
        granted_fields TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;

    const createAuditLogs = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        actor_user_id TEXT,
        actor_handle TEXT,
        subject_user_id TEXT,
        subject_handle TEXT,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `;

    if (this.dbType === 'sqlite' && this.sqliteDb) {
      this.sqliteDb.exec(createUsers);
      this.sqliteDb.exec(createBioPages);
      this.sqliteDb.exec(createSharing);
      this.sqliteDb.exec(createAuditLogs);
    } else if (this.pgDb) {
      this.pgDb.public.none(createUsers.replace('IF NOT EXISTS ', ''));
      this.pgDb.public.none(createBioPages.replace('IF NOT EXISTS ', ''));
      this.pgDb.public.none(createSharing.replace(/IF NOT EXISTS |UNIQUE/g, ''));
      this.pgDb.public.none(createAuditLogs.replace('IF NOT EXISTS ', ''));
    }
  }

  async seedTestData(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const now = new Date().toISOString();
    const testPassword = 'Test123456!@';
    const passwordHash = await bcrypt.hash(testPassword, 12);

    const seedUsers = [
      {
        id: randomUUID(),
        handle: 'jane-sec',
        displayName: 'Jane Rivera',
        bio: 'Security engineer building developer-safe auth systems.',
        linksJson: JSON.stringify([
          { label: 'Portfolio', url: 'https://example.com/jane' },
          { label: 'LinkedIn', url: 'https://linkedin.com/in/janerivera' },
        ]),
      },
      {
        id: randomUUID(),
        handle: 'matt-devrel',
        displayName: 'Matt Lee',
        bio: 'DevRel lead sharing API and platform engineering lessons.',
        linksJson: JSON.stringify([
          { label: 'Blog', url: 'https://example.com/matt/blog' },
          { label: 'X', url: 'https://x.com/mattdevrel' },
        ]),
      },
      {
        id: randomUUID(),
        handle: 'priya-product',
        displayName: 'Priya Nair',
        bio: 'Product manager focused on creator tools and monetization.',
        linksJson: JSON.stringify([
          { label: 'Newsletter', url: 'https://example.com/priya/news' },
          { label: 'Website', url: 'https://example.com/priya' },
        ]),
      },
    ];

    for (const user of seedUsers) {
      this.exec(
        `INSERT INTO users (id, handle, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5);`,
        [user.id, user.handle, passwordHash, now, now],
      );

      this.exec(
        `INSERT INTO bio_pages (id, user_id, handle, display_name, bio, links_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [randomUUID(), user.id, user.handle, user.displayName, user.bio, user.linksJson, now, now],
      );
    }
  }

  query<T>(sql: string, params: unknown[] = []): T[] {
    const sanitizedParams = this.sanitizeParams(params);
    if (this.dbType === 'sqlite' && this.sqliteDb) {
      const sqliteSql = this.convertToSqlitePlaceholders(sql);
      return this.sqliteDb.prepare(sqliteSql).all(...sanitizedParams) as T[];
    } else if ((this.dbType === 'pg-mem' || this.dbType === 'postgres') && this.pgDb) {
      const escapedParams = sanitizedParams.map((p) => this.escapeForPgMem(p));
      const compiledSql = params.length > 0 ? replaceQueryArgs$(sql, escapedParams) : sql;
      return this.pgDb.public.query(compiledSql).rows as T[];
    }
    return [];
  }

  exec(sql: string, params: unknown[] = []): void {
    const sanitizedParams = this.sanitizeParams(params);
    if (this.dbType === 'sqlite' && this.sqliteDb) {
      const sqliteSql = this.convertToSqlitePlaceholders(sql);
      this.sqliteDb.prepare(sqliteSql).run(...sanitizedParams);
    } else if ((this.dbType === 'pg-mem' || this.dbType === 'postgres') && this.pgDb) {
      const escapedParams = sanitizedParams.map((p) => this.escapeForPgMem(p));
      const compiledSql = params.length > 0 ? replaceQueryArgs$(sql, escapedParams) : sql;
      this.pgDb.public.none(compiledSql);
    }
  }

  private convertToSqlitePlaceholders(sql: string): string {
    return sql.replace(/\$(\d+)/g, '?');
  }

  private sanitizeParams(params: unknown[]): unknown[] {
    return params.map((param) => {
      if (param === null || param === undefined) {
        return param;
      }
      if (typeof param === 'string') {
        return param;
      }
      if (typeof param === 'number' || typeof param === 'boolean') {
        return param;
      }
      throw new Error(`Invalid parameter type: ${typeof param}`);
    });
  }

  private escapeForPgMem(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === 'string') {
      return value.replace(/'/g, "''");
    }
    return value;
  }
}
