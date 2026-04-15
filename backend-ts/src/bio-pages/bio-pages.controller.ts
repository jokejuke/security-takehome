import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BioPagesService } from './bio-pages.service';
import { CreateBioPageDto } from './dto/create-bio-page.dto';
import { UpdateBioPageDto } from './dto/update-bio-page.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

@Controller('bio-pages')
export class BioPagesController {
  constructor(private readonly bioPagesService: BioPagesService) { }

  @Get()
  findAll(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new BadRequestException('Limit must be a number between 1 and 100');
    }
    return this.bioPagesService.findAll(parsedLimit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.bioPagesService.findOne(id);
  }

  @Get('handle/:handle')
  findOneByHandle(@Param('handle') handle: string) {
    if (!HANDLE_REGEX.test(handle)) {
      throw new BadRequestException('Invalid handle format');
    }
    return this.bioPagesService.findOneByHandle(handle);
  }

  @Post()
  create(@Body() payload: CreateBioPageDto) {
    return this.bioPagesService.create(payload);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateBioPageDto) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.bioPagesService.update(id, payload);
  }
}
