-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_video_likes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "videoId" INTEGER NOT NULL,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "video_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "video_likes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_video_likes" ("id", "userId", "videoId") SELECT "id", "userId", "videoId" FROM "video_likes";
DROP TABLE "video_likes";
ALTER TABLE "new_video_likes" RENAME TO "video_likes";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
