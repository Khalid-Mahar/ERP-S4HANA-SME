import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CreateEmployeeDto, UpdateEmployeeDto, RecordAttendanceDto } from './dto/hr.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CompanyId } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('HR')
@ApiBearerAuth('access-token')
@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Post('employees') @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@CompanyId() cid: string, @Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(cid, dto);
  }

  @Get('employees')
  findAll(@CompanyId() cid: string, @Query() p: PaginationDto) {
    return this.hrService.findAllEmployees(cid, p);
  }

  @Get('employees/departments')
  @ApiOperation({ summary: 'Get headcount by department' })
  getDepartments(@CompanyId() cid: string) {
    return this.hrService.getDepartmentSummary(cid);
  }

  @Get('employees/:id')
  findOne(@CompanyId() cid: string, @Param('id') id: string) {
    return this.hrService.findEmployeeById(cid, id);
  }

  @Put('employees/:id') @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@CompanyId() cid: string, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.hrService.updateEmployee(cid, id, dto);
  }

  @Post('employees/:id/attendance') @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Record daily attendance for an employee' })
  recordAttendance(@CompanyId() cid: string, @Param('id') id: string, @Body() dto: RecordAttendanceDto) {
    return this.hrService.recordAttendance(cid, id, dto);
  }

  @Get('attendance/report')
  @ApiOperation({ summary: 'Monthly attendance report' })
  @ApiQuery({ name: 'month', type: Number }) @ApiQuery({ name: 'year', type: Number })
  getReport(
    @CompanyId() cid: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.hrService.getAttendanceReport(cid, month, year);
  }
}
