-- CreateTable
CREATE TABLE "HashTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_HashTagToVideo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "HashTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HashTag_name_key" ON "HashTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_HashTagToVideo_AB_unique" ON "_HashTagToVideo"("A", "B");

-- CreateIndex
CREATE INDEX "_HashTagToVideo_B_index" ON "_HashTagToVideo"("B");
