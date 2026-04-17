import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../common/database.service';
import { Sharing, GrantedField } from './sharing.types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type SharingRow = {
  id: string;
  owner_handle: string;
  shared_handle: string;
  granted_fields: string;
  created_at: string;
  updated_at: string;
};

type GrantAccessInput = {
  actorUserId: string;
  ownerHandle: string;
  sharedHandle: string;
  grantedFields: GrantedField[];
};

@Injectable()
export class SharingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  grantAccess(input: GrantAccessInput): Sharing {
    const existing = this.database.query<SharingRow>(
      'SELECT id FROM sharing WHERE owner_handle = $1 AND shared_handle = $2;',
      [input.ownerHandle, input.sharedHandle],
    );

    if (existing.length > 0) {
      throw new ConflictException('Access already granted to this user');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const rows = this.database.query<SharingRow>(
      `INSERT INTO sharing (id, owner_handle, shared_handle, granted_fields, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [id, input.ownerHandle, input.sharedHandle, JSON.stringify(input.grantedFields), now, now],
    );

    const sharing = this.toSharing(rows[0]);

    this.auditLogsService.create({
      action: 'sharing.granted',
      actorUserId: input.actorUserId,
      actorHandle: input.ownerHandle,
      subjectHandle: input.sharedHandle,
      resourceType: 'sharing',
      resourceId: sharing.id,
      details: {
        grantedFields: sharing.grantedFields,
      },
    });

    return sharing;
  }

  findGranted(ownerHandle: string): Sharing[] {
    const rows = this.database.query<SharingRow>(
      'SELECT * FROM sharing WHERE owner_handle = $1 ORDER BY created_at DESC;',
      [ownerHandle],
    );
    return rows.map((row) => this.toSharing(row));
  }

  findReceived(sharedHandle: string): Sharing[] {
    const rows = this.database.query<SharingRow>(
      'SELECT * FROM sharing WHERE shared_handle = $1 ORDER BY created_at DESC;',
      [sharedHandle],
    );
    return rows.map((row) => this.toSharing(row));
  }

  findByOwnerAndShared(ownerHandle: string, sharedHandle: string): Sharing | null {
    const rows = this.database.query<SharingRow>(
      'SELECT * FROM sharing WHERE owner_handle = $1 AND shared_handle = $2;',
      [ownerHandle, sharedHandle],
    );
    return rows.length > 0 ? this.toSharing(rows[0]) : null;
  }

  revokeAccess(id: string, actorUserId: string, ownerHandle: string): void {
    const rows = this.database.query<SharingRow>(
      'SELECT * FROM sharing WHERE id = $1;',
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Sharing not found');
    }

    if (rows[0].owner_handle !== ownerHandle) {
      throw new ForbiddenException('You can only revoke your own grants');
    }

    const sharing = this.toSharing(rows[0]);
    this.database.exec('DELETE FROM sharing WHERE id = $1;', [id]);

    this.auditLogsService.create({
      action: 'sharing.revoked',
      actorUserId,
      actorHandle: ownerHandle,
      subjectHandle: sharing.sharedHandle,
      resourceType: 'sharing',
      resourceId: sharing.id,
      details: {
        grantedFields: sharing.grantedFields,
      },
    });
  }

  private toSharing(row: SharingRow): Sharing {
    return {
      id: row.id,
      ownerHandle: row.owner_handle,
      sharedHandle: row.shared_handle,
      grantedFields: JSON.parse(row.granted_fields),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
