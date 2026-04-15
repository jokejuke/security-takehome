export type AuditAction =
  | 'sharing.granted'
  | 'sharing.revoked'
  | 'bio_page.shared_update'
  | 'bio_page.deleted'
  | 'user.deleted';

export type AuditLog = {
  id: string;
  action: AuditAction;
  actorUserId: string | null;
  actorHandle: string | null;
  subjectUserId: string | null;
  subjectHandle: string | null;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
