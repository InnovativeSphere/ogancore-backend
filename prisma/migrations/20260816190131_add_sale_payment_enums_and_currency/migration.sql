/*
  Warnings:

  - You are about to alter the column `status` on the `PAYMENTS` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(4))`.
  - You are about to alter the column `status` on the `SALES` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(2))`.

*/
-- AlterTable
ALTER TABLE `PAYMENTS` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'NGN',
    MODIFY `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE `SALES` MODIFY `status` ENUM('DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PENDING';