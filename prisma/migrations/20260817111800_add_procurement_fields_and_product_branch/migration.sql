/*
  Warnings:

  - Added the required column `product_id` to the `PURCHASE_ORDERS` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `PURCHASE_ORDERS` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PRODUCTS` ADD COLUMN `branch_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `PURCHASE_ORDERS` ADD COLUMN `product_id` INTEGER NOT NULL,
    ADD COLUMN `quantity` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `PRODUCTS` ADD CONSTRAINT `PRODUCTS_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `BRANCHES`(`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PURCHASE_ORDERS` ADD CONSTRAINT `PURCHASE_ORDERS_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PRODUCTS`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;