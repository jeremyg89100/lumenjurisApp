-- CreateTable
CREATE TABLE `User` (
    `idUser` INTEGER NOT NULL AUTO_INCREMENT,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `email` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NULL,
    `prenom` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `cgu` BOOLEAN NOT NULL DEFAULT false,
    `stripeCustomerId` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`idUser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthProviderAccount` (
    `idAuthProvider` INTEGER NOT NULL AUTO_INCREMENT,
    `providerId` VARCHAR(191) NOT NULL,
    `provider` ENUM('GOOGLE') NOT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `AuthProviderAccount_providerId_key`(`providerId`),
    PRIMARY KEY (`idAuthProvider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPreference` (
    `idUserPreference` INTEGER NOT NULL AUTO_INCREMENT,
    `preferenceUI` JSON NULL,
    `accountParameters` JSON NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `UserPreference_userId_key`(`userId`),
    PRIMARY KEY (`idUserPreference`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Enterprise` (
    `idEnterprise` INTEGER NOT NULL AUTO_INCREMENT,
    `siren` VARCHAR(191) NULL,
    `codeNaf` VARCHAR(191) NULL,
    `intituleNaf` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `statusJuridiqueCode` VARCHAR(191) NULL,
    `statusJuridique` VARCHAR(191) NULL,
    `idccSelections` JSON NULL,
    `selectedIdccKey` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `Enterprise_userId_key`(`userId`),
    PRIMARY KEY (`idEnterprise`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `idAddress` INTEGER NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(191) NULL,
    `codePostal` VARCHAR(191) NULL,
    `pays` VARCHAR(191) NULL DEFAULT 'FRANCE',
    `enterpriseId` INTEGER NOT NULL,

    UNIQUE INDEX `Address_enterpriseId_key`(`enterpriseId`),
    PRIMARY KEY (`idAddress`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Token` (
    `idToken` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'USED') NOT NULL DEFAULT 'ACTIVE',
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `Token_token_key`(`token`),
    PRIMARY KEY (`idToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `idEvent` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`idEvent`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentCustom` (
    `idDocumentCustom` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `templateContent` TEXT NOT NULL,
    `userId` INTEGER NULL,
    `eventId` INTEGER NULL,

    UNIQUE INDEX `DocumentCustom_eventId_key`(`eventId`),
    PRIMARY KEY (`idDocumentCustom`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentTemplate` (
    `idDocument` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `templateContent` TEXT NOT NULL,

    PRIMARY KEY (`idDocument`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatHistory` (
    `idChatHistory` INTEGER NOT NULL AUTO_INCREMENT,
    `conversations` LONGTEXT NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ChatHistory_userId_key`(`userId`),
    PRIMARY KEY (`idChatHistory`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractHistory` (
    `idHistory` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `contractType` VARCHAR(191) NULL,
    `overallRiskScore` DOUBLE NULL,
    `wordCount` INTEGER NOT NULL DEFAULT 0,
    `clausesCount` INTEGER NOT NULL DEFAULT 0,
    `activePatchCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastOpenedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `encryptedSnapshot` LONGTEXT NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ContractHistory_externalId_key`(`externalId`),
    INDEX `ContractHistory_userId_idx`(`userId`),
    PRIMARY KEY (`idHistory`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserCredit` (
    `idUserCredit` INTEGER NOT NULL AUTO_INCREMENT,
    `creditIncluded` INTEGER NOT NULL,
    `creditAdded` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `UserCredit_userId_key`(`userId`),
    PRIMARY KEY (`idUserCredit`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `idSubscription` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING') NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,

    UNIQUE INDEX `Subscription_userId_key`(`userId`),
    PRIMARY KEY (`idSubscription`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `idPlan` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `interval` VARCHAR(191) NOT NULL,
    `creditIncluded` INTEGER NOT NULL,

    PRIMARY KEY (`idPlan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Facture` (
    `idFacture` INTEGER NOT NULL AUTO_INCREMENT,
    `price` INTEGER NOT NULL,
    `stripeInvoiceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subscriptionId` INTEGER NOT NULL,

    PRIMARY KEY (`idFacture`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Llm` (
    `idLlm` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `tokenPriceInput` INTEGER NOT NULL,
    `tokenPriceOutput` INTEGER NOT NULL,

    UNIQUE INDEX `Llm_name_key`(`name`),
    PRIMARY KEY (`idLlm`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserUpload` (
    `idUserUpload` INTEGER NOT NULL AUTO_INCREMENT,
    `uploadedImages` JSON NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `UserUpload_userId_key`(`userId`),
    PRIMARY KEY (`idUserUpload`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LlmUsage` (
    `idLlmUsage` INTEGER NOT NULL AUTO_INCREMENT,
    `startAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `totalCostUsd` DECIMAL(18, 6) NOT NULL,
    `tokenInput` INTEGER NOT NULL,
    `tokenOutput` INTEGER NOT NULL,
    `llmId` INTEGER NOT NULL,

    UNIQUE INDEX `LlmUsage_llmId_startAt_key`(`llmId`, `startAt`),
    PRIMARY KEY (`idLlmUsage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserLlmUsage` (
    `idUserLlmUsage` INTEGER NOT NULL AUTO_INCREMENT,
    `startAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `totalCostUsd` DECIMAL(18, 6) NOT NULL,
    `tokenInput` INTEGER NOT NULL,
    `tokenOutput` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `llmId` INTEGER NOT NULL,

    INDEX `UserLlmUsage_userId_idx`(`userId`),
    UNIQUE INDEX `UserLlmUsage_llmId_startAt_userId_key`(`llmId`, `startAt`, `userId`),
    PRIMARY KEY (`idUserLlmUsage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthProviderAccount` ADD CONSTRAINT `AuthProviderAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPreference` ADD CONSTRAINT `UserPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enterprise` ADD CONSTRAINT `Enterprise_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`idEnterprise`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Token` ADD CONSTRAINT `Token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentCustom` ADD CONSTRAINT `DocumentCustom_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentCustom` ADD CONSTRAINT `DocumentCustom_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`idEvent`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatHistory` ADD CONSTRAINT `ChatHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractHistory` ADD CONSTRAINT `ContractHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCredit` ADD CONSTRAINT `UserCredit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`idPlan`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Facture` ADD CONSTRAINT `Facture_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`idSubscription`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserUpload` ADD CONSTRAINT `UserUpload_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LlmUsage` ADD CONSTRAINT `LlmUsage_llmId_fkey` FOREIGN KEY (`llmId`) REFERENCES `Llm`(`idLlm`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLlmUsage` ADD CONSTRAINT `UserLlmUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLlmUsage` ADD CONSTRAINT `UserLlmUsage_llmId_fkey` FOREIGN KEY (`llmId`) REFERENCES `Llm`(`idLlm`) ON DELETE RESTRICT ON UPDATE CASCADE;
