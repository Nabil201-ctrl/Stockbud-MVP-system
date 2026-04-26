-- CreateTable
CREATE TABLE "ScrapeSite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "loginUrl" TEXT,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "schedule" TEXT NOT NULL DEFAULT '0 8 * * *',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScrapeAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeCredential" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "cookies" JSONB,
    "token" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL DEFAULT 'scheduled',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeSnapshot" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "jobId" TEXT,
    "data" JSONB NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapeCredential_siteId_key" ON "ScrapeCredential"("siteId");

-- AddForeignKey
ALTER TABLE "ScrapeSite" ADD CONSTRAINT "ScrapeSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeCredential" ADD CONSTRAINT "ScrapeCredential_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ScrapeSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ScrapeSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeSnapshot" ADD CONSTRAINT "ScrapeSnapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ScrapeSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
