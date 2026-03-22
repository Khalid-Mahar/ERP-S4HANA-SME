import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.usersService.findAll(user.companyId, p);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.findById(user.companyId, id);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  toggleActive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.toggleActive(user.companyId, id);
  }
}
