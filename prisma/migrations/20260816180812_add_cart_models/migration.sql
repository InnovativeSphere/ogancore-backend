-- AlterTable
ALTER TABLE `sales` ADD COLUMN `session_id` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `CARTS` (
    `cart_id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_id` INTEGER NOT NULL,
    `pos_id` VARCHAR(50) NULL,
    `session_id` VARCHAR(50) NULL,
    `cashier_id` INTEGER NOT NULL,
    `customer_id` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `discount_type` VARCHAR(20) NULL,
    `discount_value` DECIMAL(10, 2) NULL,
    `discount_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cart_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CART_ITEMS` (
    `cart_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CART_ITEMS_cart_id_product_id_key`(`cart_id`, `product_id`),
    PRIMARY KEY (`cart_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CARTS` ADD CONSTRAINT `CARTS_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `BRANCHES`(`branch_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CARTS` ADD CONSTRAINT `CARTS_cashier_id_fkey` FOREIGN KEY (`cashier_id`) REFERENCES `USERS`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CARTS` ADD CONSTRAINT `CARTS_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `CUSTOMERS`(`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CART_ITEMS` ADD CONSTRAINT `CART_ITEMS_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `CARTS`(`cart_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CART_ITEMS` ADD CONSTRAINT `CART_ITEMS_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PRODUCTS`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
