import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateBioPageDto } from './dto/create-bio-page.dto';
import { UpdateBioPageDto } from './dto/update-bio-page.dto';
import { BioPage } from './bio-page.types';
import { DatabaseService } from '../common/database.service';

type BioPageRow = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  links_json: string;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class BioPagesService {
  constructor(private readonly database: DatabaseService) {}

  findAll(): BioPage[] {
    const rows = this.database.query<BioPageRow>(
      'SELECT * FROM bio_pages ORDER BY created_at DESC;',
    );
    return rows.map((row) => this.toBioPage(row));
  }

  findOne(id: string): BioPage {
    const rows = this.database.query<BioPageRow>('SELECT * FROM bio_pages WHERE id = $1;', [id]);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Bio page not found');
    }
    return this.toBioPage(row);
  }

  findOneByHandle(handle: string): BioPage {
    const rows = this.database.query<BioPageRow>('SELECT * FROM bio_pages WHERE handle = $1;', [
      handle,
    ]);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Bio page not found');
    }
    return this.toBioPage(row);
  }

  create(payload: CreateBioPageDto): BioPage {
    const existingHandle = this.database.query<{ id: string }>(
      'SELECT id FROM bio_pages WHERE handle = $1;',
      [payload.handle],
    );
    if (existingHandle.length > 0) {
      throw new ConflictException('Handle already exists');
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const rows = this.database.query<BioPageRow>(
      `INSERT INTO bio_pages (id, handle, display_name, bio, links_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        id,
        payload.handle,
        payload.displayName,
        payload.bio,
        JSON.stringify(payload.links ?? []),
        now,
        now,
      ],
    );
    return this.toBioPage(rows[0]);
  }

  update(id: string, payload: UpdateBioPageDto): BioPage {
    const page = this.findOne(id);

    if (payload.handle && payload.handle !== page.handle) {
      const existingHandle = this.database.query<{ id: string }>(
        'SELECT id FROM bio_pages WHERE handle = $1 AND id != $2;',
        [payload.handle, id],
      );
      if (existingHandle.length > 0) {
        throw new ConflictException('Handle already exists');
      }
    }

    const rows = this.database.query<BioPageRow>(
      `UPDATE bio_pages
       SET handle = $1,
           display_name = $2,
           bio = $3,
           links_json = $4,
           updated_at = $5
       WHERE id = $6
       RETURNING *;`,
      [
        payload.handle ?? page.handle,
        payload.displayName ?? page.displayName,
        payload.bio ?? page.bio,
        JSON.stringify(payload.links ?? page.links),
        new Date().toISOString(),
        id,
      ],
    );

    return this.toBioPage(rows[0]);
  }

  private toBioPage(row: BioPageRow): BioPage {
    return {
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      bio: row.bio,
      links: JSON.parse(row.links_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
