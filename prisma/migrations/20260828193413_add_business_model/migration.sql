-- AlterTable
ALTER TABLE `BRANCHES` ADD COLUMN `business_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `NOTIFICATIONS` ALTER COLUMN `title` DROP DEFAULT;

-- CreateTable
CREATE TABLE `BUSINESSES` (
    `business_id` INTEGER NOT NULL AUTO_INCREMENT,
    `business_name` VARCHAR(150) NOT NULL,
    `business_type` ENUM('PERSONAL', 'BUSINESS', 'ENTREPRENEUR') NOT NULL,
    `business_email` VARCHAR(100) NULL,
    `business_phone` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `logo_url` TEXT NULL,
    `cac_registration_number` VARCHAR(50) NULL,
    `nin` VARCHAR(20) NULL,
    `kyc_status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`business_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BRANCHES` ADD CONSTRAINT `BRANCHES_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `BUSINESSES`(`business_id`) ON DELETE SET NULL ON UPDATE CASCADE;