import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type {
  AdminAccountSummary,
  AdminCredentials,
  AdminDashboard,
  AuditLogEntry,
  InstructorSummary,
  Paginated,
  StaffCredentials,
  StudentDetail,
  StudentSummary,
  SuspendResult,
} from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';
import { AdminEnrollDto, CreateAdminDto, CreateInstructorDto, ListAuditQueryDto, ListStudentsQueryDto, SuspendUserDto } from './dto/admin.dto';

/** Admin-only: dashboard numbers, student directory, instructor accounts, suspension, audit trail. */
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminUsersController {
  constructor(private readonly admin: AdminUsersService) {}

  @Get('dashboard')
  dashboard(): Promise<AdminDashboard> {
    return this.admin.dashboard();
  }

  @Get('students')
  students(@Query() query: ListStudentsQueryDto): Promise<Paginated<StudentSummary>> {
    return this.admin.listStudents(query);
  }

  @Get('students/:id')
  student(@Param('id', ParseUUIDPipe) id: string): Promise<StudentDetail> {
    return this.admin.studentDetail(id);
  }

  @Post('students/:id/enroll')
  @HttpCode(204)
  adminEnroll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminEnrollDto,
  ): Promise<void> {
    return this.admin.adminEnroll(user.userId, id, dto.courseId);
  }

  @Post('students/:id/unenroll')
  @HttpCode(204)
  adminUnenroll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminEnrollDto,
  ): Promise<void> {
    return this.admin.adminUnenroll(user.userId, id, dto.courseId);
  }

  @Get('admins')
  admins(): Promise<AdminAccountSummary[]> {
    return this.admin.listAdmins();
  }

  /** The response carries the temporary password -- shown to the admin once, never stored, never cached. */
  @Post('admins')
  @Header('Cache-Control', 'no-store')
  createAdmin(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdminDto, @Req() request: Request): Promise<AdminCredentials> {
    return this.admin.createAdmin(user.userId, dto, request.ip);
  }

  @Get('instructors')
  instructors(): Promise<InstructorSummary[]> {
    return this.admin.listInstructors();
  }

  /** The response carries the temporary password -- shown to the admin once, never stored, never cached. */
  @Post('instructors')
  @Header('Cache-Control', 'no-store')
  createInstructor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInstructorDto,
    @Req() request: Request,
  ): Promise<StaffCredentials> {
    return this.admin.createInstructor(user.userId, dto, request.ip);
  }

  @Post('instructors/:id/reset-password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffCredentials> {
    return this.admin.resetInstructorPassword(user.userId, id);
  }

  @Post('users/:id/suspend')
  @HttpCode(200)
  suspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
  ): Promise<SuspendResult> {
    return this.admin.suspend(user.userId, id, dto.reason);
  }

  @Post('users/:id/reactivate')
  @HttpCode(200)
  reactivate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<SuspendResult> {
    return this.admin.reactivate(user.userId, id);
  }

  @Post('users/:id/delete')
  @HttpCode(200)
  deleteStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
  ): Promise<SuspendResult> {
    return this.admin.deleteStaff(user.userId, id, dto.reason);
  }

  @Get('audit-log')
  auditLog(@Query() query: ListAuditQueryDto): Promise<Paginated<AuditLogEntry>> {
    return this.admin.auditLog(query);
  }

  /** Distinct action names seen so far, for the audit log's filter dropdown. */
  @Get('audit-actions')
  auditActions(): Promise<string[]> {
    return this.admin.auditActions();
  }
}
