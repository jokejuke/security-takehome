import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BioPagesService } from './bio-pages.service';
import { UpdateBioPageDto } from './dto/update-bio-page.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TokenPayload } from '../auth/auth.types';
import { SharingService } from '../sharing/sharing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

@Controller('bio-pages')
export class BioPagesController {
  constructor(
    private readonly bioPagesService: BioPagesService,
    private readonly sharingService: SharingService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  @Get()
  findAll(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new BadRequestException('Limit must be a number between 1 and 100');
    }
    return this.bioPagesService.findAll(parsedLimit);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  findMine(@Req() req: Request) {
    const user = (req as any).user as TokenPayload;
    return this.bioPagesService.findByUserId(user.sub);
  }

  @Get('handle/:handle')
  @UseGuards(AuthGuard)
  findOneByHandle(@Param('handle') handle: string) {
    if (!HANDLE_REGEX.test(handle)) {
      throw new BadRequestException('Invalid handle format');
    }
    return this.bioPagesService.findOneByHandle(handle);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.bioPagesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() payload: UpdateBioPageDto, @Req() req: Request) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const user = (req as any).user as TokenPayload;
    const bioPage = this.bioPagesService.findOne(id);

    if (bioPage.userId === user.sub) {
      return this.bioPagesService.update(id, payload);
    }

    const sharing = this.sharingService.findByOwnerAndShared(bioPage.handle, user.handle);
    if (!sharing) {
      throw new ForbiddenException('You do not have permission to edit this bio page');
    }

    const requestedFields = Object.keys(payload);
    const allowedFields: string[] = sharing.grantedFields.map(f => {
      if (f === 'display_name') return 'displayName';
      return f;
    });

    const unauthorized = requestedFields.filter(f => !allowedFields.includes(f));
    if (unauthorized.length > 0) {
      throw new ForbiddenException(`You do not have permission to edit: ${unauthorized.join(', ')}`);
    }

    const updatedBioPage = this.bioPagesService.update(id, payload);

    this.auditLogsService.create({
      action: 'bio_page.shared_update',
      actorUserId: user.sub,
      actorHandle: user.handle,
      subjectUserId: bioPage.userId,
      subjectHandle: bioPage.handle,
      resourceType: 'bio_page',
      resourceId: bioPage.id,
      details: {
        changedFields: requestedFields,
      },
    });

    return updatedBioPage;
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  delete(@Param('id') id: string, @Req() req: Request) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const user = (req as any).user as TokenPayload;
    const bioPage = this.bioPagesService.findOne(id);

    if (bioPage.userId !== user.sub) {
      throw new ForbiddenException('You can only delete your own bio page');
    }

    this.bioPagesService.delete(id);

    this.auditLogsService.create({
      action: 'bio_page.deleted',
      actorUserId: user.sub,
      actorHandle: user.handle,
      subjectUserId: bioPage.userId,
      subjectHandle: bioPage.handle,
      resourceType: 'bio_page',
      resourceId: bioPage.id,
      details: {
        deletedByOwner: true,
      },
    });
  }
}
