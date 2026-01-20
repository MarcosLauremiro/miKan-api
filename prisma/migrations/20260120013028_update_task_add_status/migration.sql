/*
  Warnings:

  - You are about to drop the column `status` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `statusId` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "status",
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "status_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
