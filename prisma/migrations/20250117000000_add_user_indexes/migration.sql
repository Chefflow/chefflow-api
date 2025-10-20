-- CreateIndex
CREATE INDEX "idx_user_provider_lookup" ON "User"("provider", "providerId");

-- CreateIndex
CREATE INDEX "idx_user_created_at" ON "User"("createdAt");
