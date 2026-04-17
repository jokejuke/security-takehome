import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { TokenPayload } from '../auth/auth.types';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(AuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findMine(@Req() req: Request, @Query('limit') limit?: string) {
    const user = (req as any).user as TokenPayload;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
      throw new BadRequestException('Limit must be a number between 1 and 200');
    }

    return this.auditLogsService.findRelevantToHandle(user.handle, parsedLimit);
  }
}
