import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BioPagesService } from './bio-pages.service';
import { CreateBioPageDto } from './dto/create-bio-page.dto';
import { UpdateBioPageDto } from './dto/update-bio-page.dto';

@Controller('bio-pages')
export class BioPagesController {
  constructor(private readonly bioPagesService: BioPagesService) {}

  @Get()
  findAll() {
    return this.bioPagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bioPagesService.findOne(id);
  }

  @Get('handle/:handle')
  findOneByHandle(@Param('handle') handle: string) {
    return this.bioPagesService.findOneByHandle(handle);
  }

  @Post()
  create(@Body() payload: CreateBioPageDto) {
    return this.bioPagesService.create(payload);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateBioPageDto) {
    return this.bioPagesService.update(id, payload);
  }
}
