-- CreateTable
CREATE TABLE `ContractTemplate` (
    `idTemplate` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contractType` VARCHAR(191) NULL,
    `sourceFilename` VARCHAR(191) NULL,
    `sourceFilePath` VARCHAR(191) NULL,
    `encryptedStructure` LONGTEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ContractTemplate_externalId_key`(`externalId`),
    INDEX `ContractTemplate_userId_idx`(`userId`),
    PRIMARY KEY (`idTemplate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplatePlaybook` (
    `idPlaybook` INTEGER NOT NULL AUTO_INCREMENT,
    `rulesText` LONGTEXT NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `templateId` INTEGER NOT NULL,

    UNIQUE INDEX `TemplatePlaybook_templateId_key`(`templateId`),
    PRIMARY KEY (`idPlaybook`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DoctrinalNote` (
    `idNote` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `clauseRef` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `templateId` INTEGER NOT NULL,

    UNIQUE INDEX `DoctrinalNote_externalId_key`(`externalId`),
    INDEX `DoctrinalNote_templateId_idx`(`templateId`),
    PRIMARY KEY (`idNote`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GenerationLog` (
    `idLog` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `variables` JSON NOT NULL,
    `promptTokens` INTEGER NOT NULL DEFAULT 0,
    `completionTokens` INTEGER NOT NULL DEFAULT 0,
    `encryptedOutput` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `templateId` INTEGER NOT NULL,

    UNIQUE INDEX `GenerationLog_externalId_key`(`externalId`),
    INDEX `GenerationLog_templateId_idx`(`templateId`),
    PRIMARY KEY (`idLog`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContractTemplate` ADD CONSTRAINT `ContractTemplate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplatePlaybook` ADD CONSTRAINT `TemplatePlaybook_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ContractTemplate`(`idTemplate`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctrinalNote` ADD CONSTRAINT `DoctrinalNote_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ContractTemplate`(`idTemplate`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GenerationLog` ADD CONSTRAINT `GenerationLog_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ContractTemplate`(`idTemplate`) ON DELETE CASCADE ON UPDATE CASCADE;
