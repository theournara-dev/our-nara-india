-- CreateTable
CREATE TABLE "order_approval_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "decision" "OrderApprovalStatus" NOT NULL,
    "note" TEXT,
    "actor_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_approval_logs_order_id_idx" ON "order_approval_logs"("order_id");
