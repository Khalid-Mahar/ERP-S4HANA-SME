import {
  Injectable, UnauthorizedException, ConflictException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { code: dto.companyCode.toUpperCase() },
    });
    if (existingCompany) {
      throw new ConflictException(`Company code '${dto.companyCode}' already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          code: dto.companyCode.toUpperCase(),
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email.toLowerCase(),
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'ADMIN',
        },
      });

      // Default accounts for new company
      await tx.account.createMany({
        data: [
          { code: '1000', name: 'Cash', type: 'ASSET', companyId: company.id },
          { code: '1100', name: 'Accounts Receivable', type: 'ASSET', companyId: company.id },
          { code: '1200', name: 'Inventory', type: 'ASSET', companyId: company.id },
          { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', companyId: company.id },
          { code: '3000', name: 'Owner Equity', type: 'EQUITY', companyId: company.id },
          { code: '4000', name: 'Sales Revenue', type: 'REVENUE', companyId: company.id },
          { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', companyId: company.id },
        ],
      });

      return { company, user };
    });

    return this.generateTokens(result.user);
  }

  async login(dto: LoginDto) {
    this.logger.log(`Login attempt: ${dto.email} for company: ${dto.companyCode}`);
    
    const company = await this.prisma.company.findUnique({
      where: { code: dto.companyCode.toUpperCase(), isActive: true },
    });
    if (!company) {
      this.logger.warn(`Login failed: Company '${dto.companyCode}' not found or inactive`);
      throw new UnauthorizedException('Invalid company code or credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId: company.id, email: dto.email.toLowerCase() } },
      include: { company: true },
    });

    if (!user) {
      this.logger.warn(`Login failed: User '${dto.email}' not found in company '${dto.companyCode}'`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(`Login failed: User '${dto.email}' is disabled`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      this.logger.warn(`Login failed: Incorrect password for '${dto.email}'`);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    this.logger.log(`Login successful: ${dto.email}`);
    return this.generateTokens(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    const { password, ...result } = user as any;
    return result;
  }

  private async generateTokens(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role, 
      companyId: user.companyId 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name || '',
      },
    };
  }
}
