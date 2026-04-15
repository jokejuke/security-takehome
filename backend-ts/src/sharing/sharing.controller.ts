import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SharingService } from './sharing.service';
import { GrantAccessDto } from './dto/grant-access.dto';
import { TokenPayload } from '../auth/auth.types';

@Controller('sharing')
@UseGuards(AuthGuard)
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post()
  grantAccess(@Body() dto: GrantAccessDto, @Req() req: Request) {
    const user = (req as any).user as TokenPayload;
    return this.sharingService.grantAccess(user.handle, dto.sharedHandle, dto.grantedFields);
  }

  @Get('granted')
  findGranted(@Req() req: Request) {
    const user = (req as any).user as TokenPayload;
    return this.sharingService.findGranted(user.handle);
  }

  @Get('received')
  findReceived(@Req() req: Request) {
    const user = (req as any).user as TokenPayload;
    return this.sharingService.findReceived(user.handle);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeAccess(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user as TokenPayload;
    this.sharingService.revokeAccess(id, user.handle);
  }
}
