-- Replace the previous display-name value with the stable sweeps player ID.
ALTER TABLE "SweepsNameMatch" DROP COLUMN "sweepsName";
ALTER TABLE "SweepsNameMatch" ADD COLUMN "sweepsId" INTEGER;
