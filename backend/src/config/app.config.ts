import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  appName: process.env.APP_NAME || 'ERP System',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-it-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
}));
