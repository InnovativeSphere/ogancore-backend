/*
  Warnings:

  - You are about to drop the column `category` on the `EXPENSES` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[expense_number]` on the table `EXPENSES` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category_id` to the `EXPENSES` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expense_number` to the `EXPENSES` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_method` to the `EXPENSES` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `EXPENSES` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `EXPENSES` DROP COLUMN `category`,
    ADD COLUMN `approved_by` INTEGER NULL,
    ADD COLUMN `attachment` TEXT NULL,
    ADD COLUMN `category_id` INTEGER NOT NULL,
    ADD COLUMN `expense_number` VARCHAR(191) NOT NULL,
    ADD COLUMN `payment_method` ENUM('CASH', 'POS_CARD', 'BANK_TRANSFER', 'OTHER') NOT NULL,
    ADD COLUMN `reference` VARCHAR(50) NULL,
    ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `EXPENSE_CATEGORIES` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `EXPENSES_expense_number_key` ON `EXPENSES`(`expense_number`);

-- AddForeignKey
ALTER TABLE `EXPENSES` ADD CONSTRAINT `EXPENSES_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `USERS`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EXPENSES` ADD CONSTRAINT `EXPENSES_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `EXPENSE_CATEGORIES`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;