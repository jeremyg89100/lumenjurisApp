-- AlterTable
ALTER TABLE `facture` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PAID';

-- CreateTable
CREATE TABLE `ContractSummary` (
    `idSummary` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `parties` TEXT NOT NULL,
    `objet` TEXT NOT NULL,
    `obligations` JSON NOT NULL,
    `pointsAttention` JSON NOT NULL,
    `duree` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `rawText` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `contractId` INTEGER NULL,

    UNIQUE INDEX `ContractSummary_externalId_key`(`externalId`),
    INDEX `ContractSummary_userId_idx`(`userId`),
    PRIMARY KEY (`idSummary`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContractSummary` ADD CONSTRAINT `ContractSummary_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractSummary` ADD CONSTRAINT `ContractSummary_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`idContract`) ON DELETE SET NULL ON UPDATE CASCADE;
