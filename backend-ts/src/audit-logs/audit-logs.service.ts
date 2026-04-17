import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../common/database.service';
import { AuditAction, AuditLog } from './audit-log.types';

type AuditLogRow = {
  id: string;
  action: AuditAction;
  actor_user_id: string | null;
  actor_handle: string | null;
  subject_user_id: string | null;
  subject_handle: string | null;
  resource_type: string;
  resource_id: string | null;
  details_json: string;
  created_at: string;
};

type CreateAuditLogInput = {
  action: AuditAction;
  actorUserId?: string | null;
  actorHandle?: string | null;
  subjectUserId?: string | null;
  subjectHandle?: string | null;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly database: DatabaseService) {}

  create(input: CreateAuditLogInput): AuditLog {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const rows = this.database.query<AuditLogRow>(
      `INSERT INTO audit_logs (
         id,
         action,
         actor_user_id,
         actor_handle,
         subject_user_id,
         subject_handle,
         resource_type,
         resource_id,
         details_json,
         created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        id,
        input.action,
        input.actorUserId ?? null,
        input.actorHandle ?? null,
        input.subjectUserId ?? null,
        input.subjectHandle ?? null,
        input.resourceType,
        input.resourceId ?? null,
        JSON.stringify(input.details ?? {}),
        createdAt,
      ],
    );

    return this.toAuditLog(rows[0]);
  }

  findRelevantToHandle(handle: string, limit: number = 100): AuditLog[] {
    const rows = this.database.query<AuditLogRow>(
      `SELECT *
       FROM audit_logs
       WHERE actor_handle = $1 OR subject_handle = $1
       ORDER BY created_at DESC
       LIMIT $2;`,
      [handle, limit],
    );

    return rows.map((row) => this.toAuditLog(row));
  }

  private toAuditLog(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      action: row.action,
      actorUserId: row.actor_user_id,
      actorHandle: row.actor_handle,
      subjectUserId: row.subject_user_id,
      subjectHandle: row.subject_handle,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: JSON.parse(row.details_json),
      createdAt: row.created_at,
    };
  }
}
