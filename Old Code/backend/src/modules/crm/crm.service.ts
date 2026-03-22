import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateLeadDto, UpdateLeadDto, CreateInteractionDto } from './dto/crm.dto';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async createLead(companyId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: { ...dto, companyId } });
  }

  async findAllLeads(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search, mode: 'insensitive' } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
        { company: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where, skip: pagination.skip, take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { interactions: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return new PaginatedResult(leads, total, pagination);
  }

  async findLeadById(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, companyId },
      include: { interactions: { orderBy: { date: 'desc' } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateLead(companyId: string, id: string, dto: UpdateLeadDto) {
    await this.findLeadById(companyId, id);
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async createInteraction(companyId: string, dto: CreateInteractionDto) {
    return this.prisma.customerInteraction.create({ data: dto });
  }

  async getLeadsPipeline(companyId: string) {
    const leads = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { id: true },
      _sum: { value: true },
    });
    return leads.map((l) => ({
      status: l.status,
      count: l._count.id,
      totalValue: l._sum.value || 0,
    }));
  }

  async getInteractions(companyId: string, pagination: PaginationDto) {
    // Interactions related to this company's customers or leads
    const [interactions, total] = await Promise.all([
      this.prisma.customerInteraction.findMany({
        where: {
          OR: [
            { customer: { companyId } },
            { lead: { companyId } },
          ],
        },
        skip: pagination.skip, take: pagination.take,
        orderBy: { date: 'desc' },
        include: {
          customer: { select: { name: true } },
          lead: { select: { name: true } },
        },
      }),
      this.prisma.customerInteraction.count({
        where: { OR: [{ customer: { companyId } }, { lead: { companyId } }] },
      }),
    ]);
    return new PaginatedResult(interactions, total, pagination);
  }
}
