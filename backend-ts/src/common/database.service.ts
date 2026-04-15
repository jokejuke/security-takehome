import { Injectable } from '@nestjs/common';
import { newDb, replaceQueryArgs$ } from 'pg-mem';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  constructor() {
    const env = process.env.NODE_ENV || 'development';
    const configPath = join(__dirname, '..', '..', 'config', `${env}.json`);
    const config: DatabaseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    this.dbType = config.database.type;

    if (this.dbType === 'sqlite') {
      this.sqliteDb = new Database(config.database.path || ':memory:');
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS bio_pages (
          id TEXT PRIMARY KEY,
          handle TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          bio TEXT NOT NULL,
          links_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    } else if (this.dbType === 'pg-mem' || this.dbType === 'postgres') {
      this.pgDb = newDb();
      this.pgDb.public.none(`
        CREATE TABLE bio_pages (
          id TEXT PRIMARY KEY,
          handle TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          bio TEXT NOT NULL,
          links_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    }

    const now = new Date().toISOString();
    const seedRows = [
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

    for (const row of seedRows) {
      this.exec(
        `INSERT INTO bio_pages (id, handle, display_name, bio, links_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [row.id, row.handle, row.displayName, row.bio, row.linksJson, now, now],
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
