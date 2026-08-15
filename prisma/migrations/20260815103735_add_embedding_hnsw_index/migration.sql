-- 为 document_chunks.embedding 创建 HNSW 余弦相似度索引，加速向量检索。
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_hnsw_idx"
  ON "document_chunks" USING hnsw (embedding vector_cosine_ops);