-- AlterTable / AddForeignKey
ALTER TABLE `NegotiationSession`
ADD CONSTRAINT `NegotiationSession_contractExternalId_fkey`
FOREIGN KEY (`contractExternalId`) REFERENCES `Contract`(`externalId`)
ON DELETE CASCADE ON UPDATE CASCADE;
