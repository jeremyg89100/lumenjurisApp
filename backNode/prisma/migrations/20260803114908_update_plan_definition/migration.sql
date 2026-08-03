/*
  Warnings:

  - You are about to drop the column `creditIncluded` on the `plan` table. All the data in the column will be lost.
  - Added the required column `creditsIncluded` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripePriceId` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeProductId` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `plan` DROP COLUMN `creditIncluded`,
    ADD COLUMN `creditsIncluded` JSON NOT NULL,
    ADD COLUMN `stripePriceId` VARCHAR(191) NOT NULL,
    ADD COLUMN `stripeProductId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `CreditTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` INTEGER NOT NULL,
    `balanceAfter` INTEGER NOT NULL,
    `type` ENUM('SUBSCRIPTION', 'PURCHASE', 'CONSUMPTION', 'BONUS', 'REFUND', 'ADMIN', 'EXPIRE') NOT NULL,
    `description` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreditTransaction` ADD CONSTRAINT `CreditTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;
