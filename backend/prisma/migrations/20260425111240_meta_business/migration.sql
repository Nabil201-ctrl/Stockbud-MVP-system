-- AlterTable
ALTER TABLE "SocialStore" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "metaBusinessId" TEXT,
ADD COLUMN     "metaCatalogId" TEXT,
ADD COLUMN     "metaPageId" TEXT,
ADD COLUMN     "refreshToken" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isShopifyUser" BOOLEAN NOT NULL DEFAULT false;
