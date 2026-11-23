import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import type { AdminCourse, AdminCourseCategoryOption, AdminCourseDetail, AdminCourseDomainOption, CourseImageUploadResult } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminCoursesService } from './admin-courses.service';
import { CourseInputDto } from './dto/admin-course.dto';

class SetCourseInstructorsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  instructorIds!: string[];
}

const COVER_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const COVER_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminCoursesController {
  constructor(private readonly courses: AdminCoursesService) {}

  @Get('courses')
  list(): Promise<AdminCourse[]> {
    return this.courses.list();
  }

  @Get('courses/categories')
  listCategories(): Promise<AdminCourseCategoryOption[]> {
    return this.courses.listCategories();
  }

  @Get('courses/domains')
  listDomains(): Promise<AdminCourseDomainOption[]> {
    return this.courses.listDomains();
  }

  @Get('courses/:id')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminCourseDetail> {
    return this.courses.detail(id);
  }

  @Post('courses')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CourseInputDto): Promise<AdminCourseDetail> {
    return this.courses.create(user.userId, dto);
  }

  @Put('courses/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CourseInputDto,
  ): Promise<AdminCourseDetail> {
    return this.courses.update(user.userId, id, dto);
  }

  @Delete('courses/:id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<{ ok: true }> {
    await this.courses.remove(user.userId, id);
    return { ok: true };
  }

  /**
   * Goes through the API (service-role Storage write), same reasoning as
   * ProfileController.uploadAvatar/AdminBlogController.uploadCoverImage --
   * never direct browser-to-Storage. AdminCoursesService.uploadCoverImage
   * rejects anything that isn't exactly the catalogue's fixed cover size.
   */
  @Post('courses/cover-image')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: COVER_IMAGE_MAX_BYTES } }))
  uploadCoverImage(@UploadedFile() file?: Express.Multer.File): Promise<CourseImageUploadResult> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    if (!COVER_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("That file type isn't supported (allowed: jpeg, png, webp).");
    }
    return this.courses.uploadCoverImage(file);
  }

  @Put('courses/:id/instructors')
  setInstructors(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCourseInstructorsDto,
  ): Promise<AdminCourse> {
    return this.courses.setInstructors(user.userId, id, dto.instructorIds);
  }
}
