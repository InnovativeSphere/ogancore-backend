-- AlterTable
ALTER TABLE `products` ADD COLUMN `brand_id` VARCHAR(50) NULL,
    ADD COLUMN `discount` DECIMAL(10, 2) NULL,
    ADD COLUMN `image` TEXT NULL,
    ADD COLUMN `tax_rate` DECIMAL(5, 2) NULL,
    ADD COLUMN `track_inventory` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `unit` VARCHAR(20) NULL,
    ADD COLUMN `wholesale_price` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `sale_items` ADD COLUMN `discount` DECIMAL(10, 2) NULL,
    ADD COLUMN `tax` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `pos_id` VARCHAR(50) NULL;
