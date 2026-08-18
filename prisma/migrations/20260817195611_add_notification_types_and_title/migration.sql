/*
  Warnings:

  - You are about to alter the column `type` on the `NOTIFICATIONS` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(12))`.
  - Added the required column `title` to the `NOTIFICATIONS` table without a default value. This is not possible if the table is not empty.

*/
-- Convert old notification types to a safe default
UPDATE `NOTIFICATIONS` SET `type` = 'GENERAL' WHERE `type` NOT IN ('LOW_STOCK','OUT_OF_STOCK','SUBSCRIPTION_EXPIRY','SUBSCRIPTION_RENEWAL','REPORT_READY','PAYMENT_RECEIVED','PAYMENT_FAILED','EXPENSE_APPROVED','EXPENSE_REJECTED','SYSTEM_ALERT','USER_WELCOME','GENERAL');

-- AlterTable
ALTER TABLE `NOTIFICATIONS` ADD COLUMN `title` VARCHAR(100) NOT NULL DEFAULT 'Notification',
    MODIFY `type` ENUM('LOW_STOCK', 'OUT_OF_STOCK', 'SUBSCRIPTION_EXPIRY', 'SUBSCRIPTION_RENEWAL', 'REPORT_READY', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'SYSTEM_ALERT', 'USER_WELCOME', 'GENERAL') NOT NULL;