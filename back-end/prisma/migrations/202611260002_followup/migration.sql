ALTER TABLE "Answer" ADD COLUMN "nextContentId" TEXT;
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_nextContentId_fkey" FOREIGN KEY ("nextContentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
