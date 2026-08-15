-- 调整 embedding 列维度为 1024，匹配百炼 text-embedding-v3。
-- 当前阶段尚无已生成的向量数据，直接删除列后重建最安全。
ALTER TABLE "document_chunks" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "document_chunks" ADD COLUMN "embedding" vector(1024);