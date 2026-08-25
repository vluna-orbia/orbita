import { PrismaClient } from "@prisma/client";

// Cliente único de Prisma. En desarrollo se cuelga de globalThis para
// sobrevivir a la recarga en caliente sin agotar conexiones.

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
