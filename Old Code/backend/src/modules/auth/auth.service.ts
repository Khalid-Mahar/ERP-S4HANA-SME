import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto, LoginDto, CreateUserDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Register new company + admin user ──────────────────────────
  async register(dto: RegisterDto) {
    // Check company code uniqueness
    const existingCompany = await this.prisma.company.findUnique({
      where: { code: dto.companyCode.toUpperCase() },
    });
    if (existingCompany) {
      throw new ConflictException(`Company code '${dto.companyCode}' already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create company + admin user in a transaction
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

      // Seed default chart of accounts for new company
      await this.seedDefaultAccounts(tx, company.id);

      return { company, user };
    });

    this.logger.log(`New company registered: ${result.company.code}`);
    return this.generateTokens(result.user);
  }

  // ── Login ──────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const company = await this.prisma.company.findUnique({
      where: { code: dto.companyCode.toUpperCase(), isActive: true },
    });
    if (!company) {
      throw new UnauthorizedException('Invalid company code or credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId: company.id, email: dto.email.toLowerCase() } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.email} [${company.code}]`);
    return this.generateTokens(user);
  }

  // ── Refresh tokens ─────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Rotate: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
    return this.generateTokens(storedToken.user);
  }

  // ── Logout ─────────────────────────────────────────────────────
  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  // ── Create user within a company ───────────────────────────────
  async createUser(companyId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId, email: dto.email.toLowerCase() } },
    });
    if (existing) {
      throw new ConflictException('Email already registered in this company');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        companyId,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'USER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
    });

    return user;
  }

  // ── Private helpers ────────────────────────────────────────────
  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('app.jwt.accessSecret'),
        expiresIn: this.configService.get('app.jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('app.jwt.refreshSecret'),
        expiresIn: this.configService.get('app.jwt.refreshExpiresIn'),
      }),
    ]);

    // Persist refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  private async seedDefaultAccounts(tx: any, companyId: string) {
    const accounts = [
      { code: '1000', name: 'Cash', type: 'ASSET' },
      { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
      { code: '1200', name: 'Inventory', type: 'ASSET' },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
      { code: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
    ];

    await tx.account.createMany({
      data: accounts.map((a) => ({ ...a, companyId })),
    });
  }
}
