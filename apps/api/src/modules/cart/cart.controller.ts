import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import type { CartItemSummary } from '@aiit/shared';
import { JwtGuard, type AuthenticatedUser } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListCoursesQueryDto } from '../courses/dto/list-courses.query.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CartService } from './cart.service';

// The cart is a learner-portal feature -- @Roles here is the real
// enforcement, not just the frontend hiding the "Add to cart" button for a
// non-learner account (which it also does, see CoursesPage.tsx/
// CourseDetailPage.tsx's isLearner checks -- never trust client-only gating).
@Controller('me/cart')
@UseGuards(JwtGuard, RolesGuard)
@Roles('learner')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCoursesQueryDto, @Req() request: Request): Promise<CartItemSummary[]> {
    return this.cart.list(user.userId, { query: { currency: query.currency }, headers: request.headers });
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddToCartDto): Promise<void> {
    return this.cart.add(user.userId, dto.courseSlug);
  }

  @Delete(':courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('courseId', ParseUUIDPipe) courseId: string): Promise<void> {
    return this.cart.remove(user.userId, courseId);
  }
}
