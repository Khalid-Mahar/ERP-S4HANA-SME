import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CreateEmployeeDto, UpdateEmployeeDto, RecordAttendanceDto } from './dto/hr.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Post('employees')
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(user.companyId, dto);
  }

  @Get('employees')
  findAll(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.hrService.findAllEmployees(user.companyId, p);
  }

  @Get('employees/departments')
  @ApiOperation({ summary: 'Get headcount by department' })
  getDepartments(@CurrentUser() user: any) {
    return this.hrService.getDepartmentSummary(user.companyId);
  }

  @Get('employees/:id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.hrService.findEmployeeById(user.companyId, id);
  }

  @Put('employees/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.hrService.updateEmployee(user.companyId, id, dto);
  }

  @Post('employees/:id/attendance')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Record daily attendance for an employee' })
  recordAttendance(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RecordAttendanceDto) {
    return this.hrService.recordAttendance(user.companyId, id, dto);
  }

  @Get('attendance/report')
  @ApiOperation({ summary: 'Monthly attendance report' })
  @ApiQuery({ name: 'month', type: Number })
  @ApiQuery({ name: 'year', type: Number })
  getReport(
    @CurrentUser() user: any,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.hrService.getAttendanceReport(user.companyId, month, year);
  }
}
