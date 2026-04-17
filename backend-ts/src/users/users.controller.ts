import { Controller, Delete, Get, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { DatabaseService } from '../common/database.service';
import { AuthService } from '../auth/auth.service';
import { TokenPayload } from '../auth/auth.types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type UserRow = {
  id: string;
  handle: string;
  deleted_at: string | null;
  created_at: string;
};

type BioPageRow = {
  display_name: string;
  bio: string;
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly database: DatabaseService,
    private readonly authService: AuthService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    const users = this.database.query<UserRow>(
      'SELECT id, handle, created_at, deleted_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC;',
    );

    return users.map((user) => {
      const bioPages = this.database.query<BioPageRow>(
        'SELECT display_name, bio FROM bio_pages WHERE user_id = $1;',
        [user.id],
      );
      const bioPage = bioPages[0];

      return {
        id: user.id,
        handle: user.handle,
        displayName: bioPage?.display_name || user.handle,
        bio: bioPage?.bio || '',
        createdAt: user.created_at,
      };
    });
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@Req() req: Request) {
    const user = (req as any).user as TokenPayload;
    const accessToken = req.headers.authorization?.substring(7) || '';
    // Client should send its refresh token here so both tokens are revoked
    const refreshToken = req.headers['x-refresh-token'] as string | undefined;

    const bioPageRows = this.database.query<{ id: string; handle: string }>(
      'SELECT id, handle FROM bio_pages WHERE user_id = $1;',
      [user.sub],
    );
    const bioPage = bioPageRows[0] ?? null;

    const now = new Date().toISOString();
    this.database.exec(
      'UPDATE users SET deleted_at = $1 WHERE id = $2;',
      [now, user.sub],
    );

    this.auditLogsService.create({
      action: 'user.deleted',
      actorUserId: user.sub,
      actorHandle: user.handle,
      subjectUserId: user.sub,
      subjectHandle: user.handle,
      resourceType: 'user',
      resourceId: user.sub,
      details: {
        bioPageId: bioPage?.id ?? null,
        bioPageHandle: bioPage?.handle ?? user.handle,
        deletedAt: now,
      },
    });

    await this.authService.signOut(accessToken, refreshToken);
  }
}
