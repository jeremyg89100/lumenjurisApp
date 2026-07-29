-- CreateTable
CREATE TABLE `FeatureUsage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `feature` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeatureUsage_userId_idx`(`userId`),
    INDEX `FeatureUsage_feature_idx`(`feature`),
    INDEX `FeatureUsage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeatureUsage` ADD CONSTRAINT `FeatureUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE SET NULL ON UPDATE CASCADE;
