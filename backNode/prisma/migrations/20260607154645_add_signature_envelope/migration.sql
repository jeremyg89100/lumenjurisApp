-- CreateTable
CREATE TABLE `SignatureEnvelope` (
    `idEnvelope` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `documentName` VARCHAR(191) NOT NULL,
    `documentFilePath` VARCHAR(191) NULL,
    `numPages` INTEGER NOT NULL DEFAULT 1,
    `encryptedFields` LONGTEXT NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'PARTIALLY_SIGNED', 'SIGNED', 'DECLINED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `selfName` VARCHAR(191) NOT NULL,
    `selfEmail` VARCHAR(191) NOT NULL,
    `counterpartyName` VARCHAR(191) NOT NULL,
    `counterpartyEmail` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `selfSignedAt` DATETIME(3) NULL,
    `counterpartySignedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `SignatureEnvelope_externalId_key`(`externalId`),
    INDEX `SignatureEnvelope_userId_idx`(`userId`),
    INDEX `SignatureEnvelope_status_idx`(`status`),
    PRIMARY KEY (`idEnvelope`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SignatureEnvelope` ADD CONSTRAINT `SignatureEnvelope_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;
