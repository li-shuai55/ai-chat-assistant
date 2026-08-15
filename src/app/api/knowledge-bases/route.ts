/**
 * @file route.ts
 * @description 知识库接口：列表查询与创建。
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

/**
 * GET /api/knowledge-bases
 * 返回知识库列表，按创建时间倒序。
 */
export async function GET() {
  try {
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: { documents: true },
        },
      },
    });

    return NextResponse.json({ knowledgeBases });
  } catch (error) {
    console.error('Failed to fetch knowledge bases:', error);
    const message = error instanceof Error ? error.message : '获取知识库失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/knowledge-bases
 * 创建一个知识库，返回新建知识库 ID。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; description?: string };
    const name = body.name?.trim() ?? '默认知识库';

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name,
        description: body.description,
      },
    });

    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    console.error('Failed to create knowledge base:', error);
    const message = error instanceof Error ? error.message : '创建知识库失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
