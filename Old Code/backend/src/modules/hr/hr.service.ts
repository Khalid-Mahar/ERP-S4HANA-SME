import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateEmployeeDto, UpdateEmployeeDto, RecordAttendanceDto } from './dto/hr.dto';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  async createEmployee(companyId: string, dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { companyId_employeeId: { companyId, employeeId: dto.employeeId } },
    });
    if (existing) throw new ConflictException('Employee ID already exists');
    return this.prisma.employee.create({
      data: { ...dto, hireDate: new Date(dto.hireDate), companyId },
    });
  }

  async findAllEmployees(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.OR = [
        { employeeId: { contains: pagination.search, mode: 'insensitive' } },
        { firstName: { contains: pagination.search, mode: 'insensitive' } },
        { lastName: { contains: pagination.search, mode: 'insensitive' } },
        { department: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip: pagination.skip, take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return new PaginatedResult(employees, total, pagination);
  }

  async findEmployeeById(companyId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        attendance: { orderBy: { date: 'desc' }, take: 30 },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async updateEmployee(companyId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findEmployeeById(companyId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { ...dto, hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined },
    });
  }

  async recordAttendance(companyId: string, employeeId: string, dto: RecordAttendanceDto) {
    const emp = await this.findEmployeeById(companyId, employeeId);
    const date = new Date(dto.date);

    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: emp.id, date } },
      update: {
        checkIn: dto.checkIn ? new Date(`${dto.date}T${dto.checkIn}`) : undefined,
        checkOut: dto.checkOut ? new Date(`${dto.date}T${dto.checkOut}`) : undefined,
        status: dto.status,
        notes: dto.notes,
      },
      create: {
        employeeId: emp.id,
        date,
        checkIn: dto.checkIn ? new Date(`${dto.date}T${dto.checkIn}`) : null,
        checkOut: dto.checkOut ? new Date(`${dto.date}T${dto.checkOut}`) : null,
        status: dto.status || 'PRESENT',
        notes: dto.notes,
      },
    });
  }

  async getAttendanceReport(companyId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        attendance: {
          where: { date: { gte: start, lte: end } },
          orderBy: { date: 'asc' },
        },
      },
    });

    return employees.map((emp) => {
      const present = emp.attendance.filter((a) => a.status === 'PRESENT').length;
      const absent = emp.attendance.filter((a) => a.status === 'ABSENT').length;
      const leave = emp.attendance.filter((a) => a.status === 'LEAVE').length;
      return {
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        present, absent, leave,
        attendance: emp.attendance,
      };
    });
  }

  async getDepartmentSummary(companyId: string) {
    const employees = await this.prisma.employee.groupBy({
      by: ['department'],
      where: { companyId, status: 'ACTIVE' },
      _count: { id: true },
    });
    return employees.map((e) => ({
      department: e.department || 'Unassigned',
      count: e._count.id,
    }));
  }
}
