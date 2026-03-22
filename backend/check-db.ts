import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool as any);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Checking database for seed data...');
    
    const company = await prisma.company.findUnique({
      where: { code: 'GLOBAL-01' }
    });
    
    if (!company) {
      console.log('❌ Company GLOBAL-01 NOT found.');
    } else {
      console.log('✅ Company found:', company.name);
      
      const user = await prisma.user.findUnique({
        where: { 
          companyId_email: { 
            companyId: company.id, 
            email: 'admin@company.com' 
          } 
        }
      });
      
      if (!user) {
        console.log('❌ User admin@company.com NOT found in this company.');
      } else {
        console.log('✅ User found:', user.firstName, user.lastName);
        console.log('User Active:', user.isActive);
      }
    }
  } catch (err) {
    console.error('❌ Database error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
