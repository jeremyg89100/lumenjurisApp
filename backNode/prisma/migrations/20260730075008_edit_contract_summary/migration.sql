/*
  Warnings:

  - You are about to drop the column `pointsAttention` on the `contractsummary` table. All the data in the column will be lost.
  - You are about to alter the column `parties` on the `contractsummary` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.
  - Added the required column `annexes` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clauses_particulieres` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conditions_financieres` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dates` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delais_importants` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `identification` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `niveau_risque` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `points_attention` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resiliation` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `responsabilite` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resume_executif` to the `ContractSummary` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `contractsummary` DROP COLUMN `pointsAttention`,
    ADD COLUMN `annexes` JSON NOT NULL,
    ADD COLUMN `clauses_particulieres` JSON NOT NULL,
    ADD COLUMN `conditions_financieres` JSON NOT NULL,
    ADD COLUMN `dates` JSON NOT NULL,
    ADD COLUMN `delais_importants` JSON NOT NULL,
    ADD COLUMN `identification` JSON NOT NULL,
    ADD COLUMN `niveau_risque` JSON NOT NULL,
    ADD COLUMN `points_attention` JSON NOT NULL,
    ADD COLUMN `resiliation` JSON NOT NULL,
    ADD COLUMN `responsabilite` JSON NOT NULL,
    ADD COLUMN `resume_executif` TEXT NOT NULL,
    MODIFY `parties` JSON NOT NULL;
