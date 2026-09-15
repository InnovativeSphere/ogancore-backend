-- AlterTable
ALTER TABLE `BUSINESSES` ADD COLUMN `kyc_document_url` TEXT NULL,
    ADD COLUMN `kyc_method` ENUM('API', 'MANUAL') NULL,
    ADD COLUMN `kyc_verified_at` DATETIME(3) NULL,
    ADD COLUMN `kyc_verified_by` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `BUSINESSES` ADD CONSTRAINT `BUSINESSES_kyc_verified_by_fkey` FOREIGN KEY (`kyc_verified_by`) REFERENCES `USERS`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;