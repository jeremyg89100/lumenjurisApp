-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('USER', 'ADMIN', 'JURISTE', 'LECTEUR') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `Contract` (
    `idContract` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `contractType` VARCHAR(191) NULL,
    `counterpartyName` VARCHAR(191) NULL,
    `responsibleName` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'IN_NEGOTIATION', 'ACTIVE', 'TACIT_RENEWAL', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'DRAFT',
    `signatureDate` DATETIME(3) NULL,
    `effectiveDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `durationMonths` INTEGER NULL,
    `renewalType` ENUM('NONE', 'TACIT', 'EXPRESS') NOT NULL DEFAULT 'NONE',
    `noticePeriodDays` INTEGER NULL,
    `isB2C` BOOLEAN NOT NULL DEFAULT false,
    `amount` DECIMAL(18, 2) NULL,
    `currency` VARCHAR(191) NULL DEFAULT 'EUR',
    `governingLaw` VARCHAR(191) NULL,
    `documentFilePath` VARCHAR(191) NULL,
    `documentMimeType` VARCHAR(191) NULL,
    `ocrText` LONGTEXT NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `retentionUntil` DATETIME(3) NULL,
    `signatureEnvelopeExternalId` VARCHAR(191) NULL,
    `templateExternalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `folderId` INTEGER NULL,

    UNIQUE INDEX `Contract_externalId_key`(`externalId`),
    INDEX `Contract_userId_idx`(`userId`),
    INDEX `Contract_status_idx`(`status`),
    INDEX `Contract_endDate_idx`(`endDate`),
    INDEX `Contract_folderId_idx`(`folderId`),
    PRIMARY KEY (`idContract`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractMetadataField` (
    `idField` INTEGER NOT NULL AUTO_INCREMENT,
    `fieldKey` VARCHAR(191) NOT NULL,
    `value` TEXT NULL,
    `confidenceScore` DOUBLE NULL,
    `validationStatus` ENUM('AI_SUGGESTED', 'HUMAN_VALIDATED', 'HUMAN_CORRECTED') NOT NULL DEFAULT 'AI_SUGGESTED',
    `validatedById` INTEGER NULL,
    `validatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `contractId` INTEGER NOT NULL,

    INDEX `ContractMetadataField_contractId_idx`(`contractId`),
    UNIQUE INDEX `ContractMetadataField_contractId_fieldKey_key`(`contractId`, `fieldKey`),
    PRIMARY KEY (`idField`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Amendment` (
    `idAmendment` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `documentFilePath` VARCHAR(191) NULL,
    `signatureDate` DATETIME(3) NULL,
    `effectiveDate` DATETIME(3) NULL,
    `summary` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `parentContractId` INTEGER NOT NULL,

    UNIQUE INDEX `Amendment_externalId_key`(`externalId`),
    INDEX `Amendment_parentContractId_idx`(`parentContractId`),
    PRIMARY KEY (`idAmendment`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractVersion` (
    `idVersion` INTEGER NOT NULL AUTO_INCREMENT,
    `versionNumber` INTEGER NOT NULL DEFAULT 1,
    `documentFilePath` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contractId` INTEGER NOT NULL,

    INDEX `ContractVersion_contractId_idx`(`contractId`),
    UNIQUE INDEX `ContractVersion_contractId_versionNumber_key`(`contractId`, `versionNumber`),
    PRIMARY KEY (`idVersion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `idTag` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#354F99',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `Tag_externalId_key`(`externalId`),
    INDEX `Tag_userId_idx`(`userId`),
    UNIQUE INDEX `Tag_userId_label_key`(`userId`, `label`),
    PRIMARY KEY (`idTag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractTag` (
    `contractId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `ContractTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`contractId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Folder` (
    `idFolder` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `parentId` INTEGER NULL,

    UNIQUE INDEX `Folder_externalId_key`(`externalId`),
    INDEX `Folder_userId_idx`(`userId`),
    INDEX `Folder_parentId_idx`(`parentId`),
    PRIMARY KEY (`idFolder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `idAudit` INTEGER NOT NULL AUTO_INCREMENT,
    `action` ENUM('IMPORT', 'AI_EXTRACTION', 'FIELD_VALIDATION', 'METADATA_UPDATE', 'AMENDMENT_ADDED', 'VERSION_ADDED', 'DOCUMENT_ACCESS', 'EXPORT', 'ARCHIVE', 'DELETE') NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `payloadBefore` JSON NULL,
    `payloadAfter` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `contractId` INTEGER NULL,

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_contractId_idx`(`contractId`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`idAudit`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `Folder`(`idFolder`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractMetadataField` ADD CONSTRAINT `ContractMetadataField_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`idContract`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Amendment` ADD CONSTRAINT `Amendment_parentContractId_fkey` FOREIGN KEY (`parentContractId`) REFERENCES `Contract`(`idContract`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractVersion` ADD CONSTRAINT `ContractVersion_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`idContract`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tag` ADD CONSTRAINT `Tag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractTag` ADD CONSTRAINT `ContractTag_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`idContract`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractTag` ADD CONSTRAINT `ContractTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`idTag`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Folder` ADD CONSTRAINT `Folder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Folder` ADD CONSTRAINT `Folder_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Folder`(`idFolder`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`idContract`) ON DELETE CASCADE ON UPDATE CASCADE;

