-- AlterTable
ALTER TABLE "task_events" ADD COLUMN     "via_ritual" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ritual_snoozes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ritual_snoozes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ritual_snoozes_tipo_fecha_key" ON "ritual_snoozes"("tipo", "fecha");
