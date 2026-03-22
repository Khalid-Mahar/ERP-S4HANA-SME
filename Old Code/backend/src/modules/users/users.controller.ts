import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CompanyId } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@CompanyId() cid: string, @Query() p: PaginationDto) {
    return this.usersService.findAll(cid, p);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@CompanyId() cid: string, @Param('id') id: string) {
    return this.usersService.findById(cid, id);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  toggleActive(@CompanyId() cid: string, @Param('id') id: string) {
    return this.usersService.toggleActive(cid, id);
  }
}
