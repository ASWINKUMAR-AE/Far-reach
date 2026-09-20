import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RAGService {
  /**
   * Mock RAG Semantic Search
   * In a real implementation with PostgreSQL, we'd use pgvector here.
   * With SQLite, we rely on basic wildcard/metadata matching as a fallback for RAG.
   */
  static async searchResearchContext(crop: string, query: string) {
    const docs = await prisma.researchDocument.findMany({
      where: {
        verification: 'VERIFIED',
        OR: [
          { crop_tags: { contains: crop } },
          { title: { contains: query } },
          { content: { contains: query } }
        ]
      },
      take: 3
    });

    if (docs.length === 0) {
      return "No verified research available for this specific query.";
    }

    const contextStr = docs.map((d, i) => `[Source ${i+1}: ${d.title} (${d.organization})]\n${d.content.substring(0, 500)}...`).join('\n\n');
    return contextStr;
  }
}
