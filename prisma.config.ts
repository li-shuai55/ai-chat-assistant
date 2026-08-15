/**
 * @file prisma.config.ts
 * @description Prisma 7 配置：数据库连接与 schema 路径。
 *
 * Prisma 7 将 datasource URL 从 schema.prisma 移出到此配置文件中，
 * 运行时再通过 driver adapter（@prisma/adapter-pg）连接 PostgreSQL。
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { defineConfig, env } from '@prisma/config';

// 手动加载 .env.local，使 env('DATABASE_URL') 能解析到本地配置
loadEnv({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
