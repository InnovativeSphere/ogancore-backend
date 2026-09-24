-- AlterTable
ALTER TABLE `EXPENSE_CATEGORIES` ADD COLUMN `business_id` INTEGER NULL,
    ADD COLUMN `is_global` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PRODUCTS` ADD COLUMN `item_type` ENUM('PRODUCT', 'SERVICE') NOT NULL DEFAULT 'PRODUCT';

-- AlterTable
ALTER TABLE `SUBSCRIPTION_INVOICES` ADD COLUMN `invoice_type` ENUM('SUBSCRIPTION', 'SALES', 'GENERAL') NOT NULL DEFAULT 'SUBSCRIPTION';

-- CreateTable
CREATE TABLE `INVOICES` (
    `invoice_id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(30) NOT NULL,
    `invoice_type` ENUM('SUBSCRIPTION', 'SALES', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `business_id` INTEGER NOT NULL,
    `branch_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `supplier_id` INTEGER NULL,
    `narration` TEXT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOIDED', 'OVERDUE') NOT NULL DEFAULT 'DRAFT',
    `issue_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `due_date` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `voided_at` DATETIME(3) NULL,
    `voided_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `INVOICES_invoice_number_key`(`invoice_number`),
    INDEX `INVOICES_business_id_idx`(`business_id`),
    INDEX `INVOICES_branch_id_idx`(`branch_id`),
    INDEX `INVOICES_status_idx`(`status`),
    PRIMARY KEY (`invoice_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Mark all existing expense categories as global
UPDATE `EXPENSE_CATEGORIES` SET `is_global` = true WHERE `business_id` IS NULL;

-- AddForeignKey
ALTER TABLE `EXPENSE_CATEGORIES` ADD CONSTRAINT `EXPENSE_CATEGORIES_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `BUSINESSES`(`business_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `INVOICES` ADD CONSTRAINT `INVOICES_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `BUSINESSES`(`business_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `INVOICES` ADD CONSTRAINT `INVOICES_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `BRANCHES`(`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `INVOICES` ADD CONSTRAINT `INVOICES_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `CUSTOMERS`(`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `INVOICES` ADD CONSTRAINT `INVOICES_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `SUPPLIERS`(`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE;