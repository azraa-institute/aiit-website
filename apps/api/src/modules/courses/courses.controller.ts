import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CourseDetail, CourseListItem, CurriculumModule } from '@aiit/shared';
import { CoursesService } from './courses.service';
import { ListCoursesQueryDto } from './dto/list-courses.query.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@Query() query: ListCoursesQueryDto, @Req() request: Request): Promise<CourseListItem[]> {
    return this.courses.list({ query: { currency: query.currency }, headers: request.headers });
  }

  @Get(':slug')
  detail(
    @Param('slug') slug: string,
    @Query() query: ListCoursesQueryDto,
    @Req() request: Request,
  ): Promise<CourseDetail> {
    return this.courses.detail(slug, { query: { currency: query.currency }, headers: request.headers });
  }

  @Get(':slug/curriculum')
  curriculum(@Param('slug') slug: string): Promise<CurriculumModule[]> {
    return this.courses.curriculum(slug);
  }
}
