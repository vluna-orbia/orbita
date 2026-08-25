// Siembra no destructiva del plan semanal mínimo (encargo 3): la semana
// en curso con los dos resultados comprometidos de la adenda 04 y las
// cinco tareas de semana que dan base de cálculo al anillo orbital.
//
// Idempotente: si ya existe una planificación para la semana en curso no
// toca nada. Pensado para ejecutarse una vez en producción como
// pre-deploy temporal (npx tsx scripts/sembrar-semana.ts), sin pasar por
// el seed completo, que es destructivo.

import { PrismaClient } from "@prisma/client";
import { inicioDeSemana, instanteInicioDeSemana } from "../src/lib/semana";

const prisma = new PrismaClient();
const USER_ID = "vluna";

const RESULTADOS: { slug: string; descripcion: string }[] = [
  {
    slug: "yajoma",
    descripcion: "Specs 015 y 016 aprobadas y la 015 implementada en development.",
  },
  {
    slug: "cribo",
    descripcion: "Maqueta del hero y la entrada unificada revisada y cerrada.",
  },
];

const TAREAS: {
  slug: string;
  titulo: string;
  estado: "semana" | "hecha";
  estimacion_min: number;
  siguiente_paso?: string;
}[] = [
  { slug: "yajoma", titulo: "Revisar y aprobar las specs 015 y 016", estado: "hecha", estimacion_min: 60 },
  {
    slug: "yajoma",
    titulo: "Implementar la spec 015 en development",
    estado: "semana",
    estimacion_min: 180,
    siguiente_paso: "Escribir la migración del mapa categoría a departamento",
  },
  {
    slug: "yajoma",
    titulo: "Preparar la resincronización del catálogo para el go-live",
    estado: "semana",
    estimacion_min: 120,
  },
  { slug: "cribo", titulo: "Revisar la maqueta del hero con el copy final", estado: "hecha", estimacion_min: 45 },
  { slug: "cribo", titulo: "Cerrar la entrada unificada de la web", estado: "semana", estimacion_min: 90 },
];

async function main() {
  const ahora = new Date();
  const semana = inicioDeSemana(ahora);

  const existente = await prisma.weeklyPlan.findUnique({ where: { semana_inicio: semana } });
  if (existente) {
    console.log("Semana ya sembrada: no se toca nada.");
    return;
  }

  const proyectos = await prisma.project.findMany({
    where: { slug: { in: [...new Set(RESULTADOS.map((r) => r.slug))] } },
  });
  const porSlug = Object.fromEntries(proyectos.map((p) => [p.slug, p.id]));
  for (const r of RESULTADOS) {
    if (!porSlug[r.slug]) throw new Error(`Falta el proyecto ${r.slug}: carga antes el seed base.`);
  }

  const plan = await prisma.weeklyPlan.create({
    data: {
      user_id: USER_ID,
      semana_inicio: semana,
      proyectos_activos: RESULTADOS.map((r) => r.slug),
      completado_paso: 4,
    },
  });
  for (const r of RESULTADOS) {
    await prisma.weeklyOutcome.create({
      data: {
        user_id: USER_ID,
        weekly_plan_id: plan.id,
        project_id: porSlug[r.slug],
        descripcion: r.descripcion,
        cumplido: null,
      },
    });
  }

  const completadaEl = new Date(
    Math.max(instanteInicioDeSemana(ahora).getTime() + 3_600_000, ahora.getTime() - 3 * 3_600_000)
  );
  for (const t of TAREAS) {
    const repetida = await prisma.task.findFirst({
      where: { project_id: porSlug[t.slug], titulo: t.titulo },
    });
    if (repetida) continue;
    await prisma.task.create({
      data: {
        user_id: USER_ID,
        project_id: porSlug[t.slug],
        titulo: t.titulo,
        estado: t.estado,
        estimacion_min: t.estimacion_min,
        siguiente_paso: t.siguiente_paso ?? null,
        origen: "manual",
        completed_at: t.estado === "hecha" ? completadaEl : null,
      },
    });
  }

  console.log(
    `Semana sembrada: plan ${semana.toISOString().slice(0, 10)}, ${RESULTADOS.length} resultados, ${TAREAS.length} tareas.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
