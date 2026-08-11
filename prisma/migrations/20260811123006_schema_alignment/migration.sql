/*
  Warnings:

  - You are about to drop the column `name` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `file_path` on the `report_log` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `report_schedule` table. All the data in the column will be lost.
  - Added the required column `branch_name` to the `BRANCHES` table without a default value. This is not possible if the table is not empty.
  - Added the required column `daily_time` to the `REPORT_SCHEDULE` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `branches` DROP COLUMN `name`,
    ADD COLUMN `branch_name` VARCHAR(100) NOT NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `report_log` DROP COLUMN `file_path`,
    ADD COLUMN `file_location` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `report_schedule` DROP COLUMN `time`,
    ADD COLUMN `daily_time` VARCHAR(5) NOT NULL;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0;
