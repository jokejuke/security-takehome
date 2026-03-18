import { Injectable } from '@nestjs/common';
import { newDb, replaceQueryArgs$ } from 'pg-mem';
import { randomUUID } from 'crypto';

@Injectable()
export class DatabaseService {
  private readonly db = newDb();

  constructor() {
    this.db.public.none(`
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
    const compiledSql = params.length > 0 ? replaceQueryArgs$(sql, params) : sql;
    return this.db.public.query(compiledSql).rows as T[];
  }

  exec(sql: string, params: unknown[] = []): void {
    const compiledSql = params.length > 0 ? replaceQueryArgs$(sql, params) : sql;
    this.db.public.none(compiledSql);
  }
}
