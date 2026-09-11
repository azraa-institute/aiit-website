import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Use alongside JwtGuard + RolesGuard: @UseGuards(JwtGuard, RolesGuard) @Roles('admin') */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
