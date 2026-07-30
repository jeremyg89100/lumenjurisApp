-- Fichier reconstitué le 28/07/2026 : le dossier de migration existait sans son
-- migration.sql (perdu), ce qui bloquait toute commande `prisma migrate`.
-- La colonne est déjà présente en base (migration marquée appliquée) ; ce SQL
-- reflète fidèlement l'état du schéma à cette étape.

-- AlterTable
ALTER TABLE `SignatureEnvelope` ADD COLUMN `signingToken` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SignatureEnvelope_signingToken_key` ON `SignatureEnvelope`(`signingToken`);
