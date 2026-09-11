import { Controller, Get } from '@nestjs/common';
import type { CourseDomain } from '@aiit/shared';
import { CoursesService } from './courses.service';

@Controller('domains')
export class DomainsController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(): Promise<CourseDomain[]> {
    return this.courses.listDomains();
  }
}
