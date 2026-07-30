-- CreateTable
CREATE TABLE `LegalWatchSource` (
    `idSource` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRunAt` DATETIME(3) NULL,

    UNIQUE INDEX `LegalWatchSource_name_key`(`name`),
    PRIMARY KEY (`idSource`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LegalWatchItem` (
    `idItem` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `contentHash` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `jurisdiction` VARCHAR(191) NULL,
    `decisionDate` DATETIME(3) NULL,
    `sourceUrl` VARCHAR(191) NOT NULL,
    `rawText` LONGTEXT NOT NULL,
    `summary` TEXT NULL,
    `legalDomain` VARCHAR(191) NULL,
    `concepts` JSON NULL,
    `impactLevel` ENUM('HAUT', 'MOYEN', 'FAIBLE') NULL,
    `isEvolution` BOOLEAN NULL,
    `confidence` DOUBLE NULL,
    `enrichedAt` DATETIME(3) NULL,
    `enrichError` TEXT NULL,
    `status` ENUM('INGESTED', 'ENRICHED', 'PUBLISHED', 'DISCARDED', 'ERROR') NOT NULL DEFAULT 'INGESTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sourceId` INTEGER NOT NULL,

    UNIQUE INDEX `LegalWatchItem_externalId_key`(`externalId`),
    UNIQUE INDEX `LegalWatchItem_contentHash_key`(`contentHash`),
    INDEX `LegalWatchItem_status_idx`(`status`),
    INDEX `LegalWatchItem_decisionDate_idx`(`decisionDate`),
    INDEX `LegalWatchItem_legalDomain_idx`(`legalDomain`),
    UNIQUE INDEX `LegalWatchItem_sourceId_providerId_key`(`sourceId`, `providerId`),
    PRIMARY KEY (`idItem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LegalConceptMapping` (
    `idConcept` INTEGER NOT NULL AUTO_INCREMENT,
    `concept` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `legalDomain` VARCHAR(191) NOT NULL,
    `keywords` JSON NOT NULL,
    `contractTypes` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `LegalConceptMapping_concept_key`(`concept`),
    PRIMARY KEY (`idConcept`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LegalWatchAlert` (
    `idAlert` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `contractIds` JSON NOT NULL,
    `status` ENUM('UNREAD', 'READ', 'DISMISSED') NOT NULL DEFAULT 'UNREAD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `itemId` INTEGER NOT NULL,

    UNIQUE INDEX `LegalWatchAlert_externalId_key`(`externalId`),
    INDEX `LegalWatchAlert_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `LegalWatchAlert_itemId_userId_key`(`itemId`, `userId`),
    PRIMARY KEY (`idAlert`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LegalWatchItem` ADD CONSTRAINT `LegalWatchItem_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `LegalWatchSource`(`idSource`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LegalWatchAlert` ADD CONSTRAINT `LegalWatchAlert_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `LegalWatchItem`(`idItem`) ON DELETE CASCADE ON UPDATE CASCADE;
