/**
 * @file db.ts
 * @description Prisma Client 单例封装（Prisma 7 + PostgreSQL driver adapter）。
 *
 * Prisma 7 要求通过 driver adapter 在运行时传入数据库连接，
 * 这里使用 @prisma/adapter-pg 配合 node-postgres 的 Pool。
 *
 * 开发环境使用全局变量缓存实例，避免 Next.js 热重载时创建过多连接；
 * 生产环境直接创建新实例。
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
