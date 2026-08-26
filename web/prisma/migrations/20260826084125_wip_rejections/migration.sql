-- CreateTable
CREATE TABLE "wip_rejections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "limite" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wip_rejections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wip_rejections" ADD CONSTRAINT "wip_rejections_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
