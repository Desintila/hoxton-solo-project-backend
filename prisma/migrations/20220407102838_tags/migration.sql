/*
  Warnings:

  - You are about to drop the `_HashTagToVideo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_HashTagToVideo";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "VideoTags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" INTEGER NOT NULL,
    "hashTagId" INTEGER NOT NULL,
    CONSTRAINT "VideoTags_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoTags_hashTagId_fkey" FOREIGN KEY ("hashTagId") REFERENCES "HashTag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
