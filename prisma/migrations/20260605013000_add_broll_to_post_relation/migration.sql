-- CreateTable conditionally to avoid conflicts across environments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_BRollToPost') THEN
        CREATE TABLE "_BRollToPost" (
            "A" TEXT NOT NULL,
            "B" TEXT NOT NULL
        );
        CREATE UNIQUE INDEX "_BRollToPost_AB_unique" ON "_BRollToPost"("A", "B");
        CREATE INDEX "_BRollToPost_B_index" ON "_BRollToPost"("B");
        ALTER TABLE "_BRollToPost" ADD CONSTRAINT "_BRollToPost_A_fkey" FOREIGN KEY ("A") REFERENCES "BRoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "_BRollToPost" ADD CONSTRAINT "_BRollToPost_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
