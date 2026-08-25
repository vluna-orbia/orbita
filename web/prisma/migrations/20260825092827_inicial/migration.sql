-- CreateEnum
CREATE TYPE "ProjectEstado" AS ENUM ('activo', 'pausado', 'archivado');

-- CreateEnum
CREATE TYPE "ProjectTipo" AS ENUM ('entrega', 'continuo');

-- CreateEnum
CREATE TYPE "TaskEstado" AS ENUM ('inbox', 'backlog', 'semana', 'en_curso', 'hecha', 'descartada');

-- CreateEnum
CREATE TYPE "TaskOrigen" AS ENUM ('manual', 'hallazgo', 'ritual');

-- CreateEnum
CREATE TYPE "SessionEstado" AS ENUM ('activa', 'cerrada', 'abandonada');

-- CreateEnum
CREATE TYPE "SourceTipo" AS ENUM ('youtube_channel', 'web_feed', 'search');

-- CreateEnum
CREATE TYPE "AccionSugerida" AS ENUM ('crear_tarea', 'revisar_decision', 'solo_leer', 'descartar');

-- CreateEnum
CREATE TYPE "FindingEstado" AS ENUM ('nuevo', 'leido', 'guardado', 'descartado', 'convertido');

-- CreateEnum
CREATE TYPE "DecisionEstado" AS ENUM ('abierta', 'cerrada', 'caducada');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cliente" TEXT,
    "slug" TEXT NOT NULL,
    "objetivo" VARCHAR(280) NOT NULL,
    "estado" "ProjectEstado" NOT NULL DEFAULT 'activo',
    "color_acento" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" "ProjectTipo" NOT NULL DEFAULT 'entrega',
    "horas_objetivo" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_briefs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contenido_md" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "secciones" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "titulo" TEXT NOT NULL,
    "notas" TEXT,
    "estado" "TaskEstado" NOT NULL DEFAULT 'inbox',
    "prioridad" INTEGER,
    "estimacion_min" INTEGER,
    "vence_el" TIMESTAMP(3),
    "siguiente_paso" TEXT,
    "bloqueada_por" TEXT,
    "motivo_bloqueo" TEXT,
    "origen" "TaskOrigen" NOT NULL DEFAULT 'manual',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_id" TEXT,
    "intencion" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duracion_min" INTEGER,
    "nota_avance" TEXT,
    "nota_bloqueo" TEXT,
    "siguiente_paso" TEXT,
    "estado" "SessionEstado" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "semana_inicio" DATE NOT NULL,
    "proyectos_activos" JSONB NOT NULL,
    "completado_paso" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_outcomes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weekly_plan_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cumplido" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retros" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weekly_plan_id" TEXT NOT NULL,
    "que_funciono" TEXT,
    "que_no" TEXT,
    "que_pruebo" TEXT,
    "metricas" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbooks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changelog" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbook_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "playbook_id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "validacion_dura" BOOLEAN NOT NULL DEFAULT false,
    "parametros" JSONB,
    "retirada_el" TIMESTAMP(3),
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbook_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adherence_metrics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "semana_inicio" DATE NOT NULL,
    "numerador" INTEGER NOT NULL,
    "denominador" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adherence_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_intents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "keywords" TEXT[],
    "justificacion" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "derivado_de_brief_version" INTEGER,
    "editado_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "SourceTipo" NOT NULL,
    "handle" TEXT,
    "url" TEXT,
    "feed_url" TEXT,
    "verticals" TEXT[],
    "habilitada" BOOLEAN NOT NULL DEFAULT true,
    "confianza" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "ultimo_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "intent_id" TEXT,
    "source_id" TEXT,
    "titulo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicado_el" TIMESTAMP(3),
    "resumen_es" TEXT NOT NULL,
    "por_que_importa" TEXT NOT NULL,
    "accion_sugerida" "AccionSugerida" NOT NULL,
    "titulo_tarea_propuesto" TEXT,
    "score_relevancia" DOUBLE PRECISION NOT NULL,
    "score_novedad" DOUBLE PRECISION NOT NULL,
    "score_accionabilidad" DOUBLE PRECISION NOT NULL,
    "estado" "FindingEstado" NOT NULL DEFAULT 'nuevo',
    "motivo_descarte" TEXT,
    "task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digest_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "duracion_s" DOUBLE PRECISION,
    "findings_count" INTEGER NOT NULL DEFAULT 0,
    "coste_desglose" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "traza" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido_md" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "opciones" JSONB NOT NULL,
    "bloqueado_por" TEXT,
    "estado" "DecisionEstado" NOT NULL DEFAULT 'abierta',
    "opcion_elegida" TEXT,
    "motivo" TEXT,
    "abierta_desde" TIMESTAMP(3) NOT NULL,
    "cerrada_el" TIMESTAMP(3),
    "dias_abierta" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "entregable" TEXT NOT NULL,
    "estimacion_h" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "completado_el" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "project_briefs_project_id_version_key" ON "project_briefs"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plans_semana_inicio_key" ON "weekly_plans"("semana_inicio");

-- CreateIndex
CREATE UNIQUE INDEX "retros_weekly_plan_id_key" ON "retros"("weekly_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "playbooks_version_key" ON "playbooks"("version");

-- CreateIndex
CREATE UNIQUE INDEX "playbook_rules_playbook_id_clave_key" ON "playbook_rules"("playbook_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "adherence_metrics_rule_key_semana_inicio_key" ON "adherence_metrics"("rule_key", "semana_inicio");

-- CreateIndex
CREATE UNIQUE INDEX "findings_project_id_url_key" ON "findings"("project_id", "url");

-- AddForeignKey
ALTER TABLE "project_briefs" ADD CONSTRAINT "project_briefs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_bloqueada_por_fkey" FOREIGN KEY ("bloqueada_por") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_outcomes" ADD CONSTRAINT "weekly_outcomes_weekly_plan_id_fkey" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_outcomes" ADD CONSTRAINT "weekly_outcomes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retros" ADD CONSTRAINT "retros_weekly_plan_id_fkey" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbook_rules" ADD CONSTRAINT "playbook_rules_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "playbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_intents" ADD CONSTRAINT "research_intents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "research_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
