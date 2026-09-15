-- AlterTable
ALTER TABLE `BUSINESSES` ADD COLUMN `kyc_rejection_reason` TEXT NULL,
    ADD COLUMN `kyc_review_requested` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `kyc_review_requested_at` DATETIME(3) NULL;