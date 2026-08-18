/*
  Warnings:

  - You are about to alter the column `status` on the `PAYMENTS` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(4))`.
  - You are about to alter the column `status` on the `SALES` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(2))`.

*/
-- Convert existing statuses to new enum values
UPDATE `SALES` SET `status` = 'COMPLETED' WHERE `status` = 'completed';
UPDATE `SALES` SET `status` = 'PENDING' WHERE `status` = 'pending';
UPDATE `SALES` SET `status` = 'RETURNED' WHERE `status` = 'refunded';

UPDATE `PAYMENTS` SET `status` = 'PAID' WHERE `status` = 'completed';
UPDATE `PAYMENTS` SET `status` = 'REFUNDED' WHERE `status` = 'refunded';

-- AlterTable
ALTER TABLE `PAYMENTS` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'NGN',
    MODIFY `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE `SALES` MODIFY `status` ENUM('DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PENDING';