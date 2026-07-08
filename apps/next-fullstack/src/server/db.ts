import { PrismaClient } from "@/generated/prisma";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    return process.env.DATABASE_URL;
  }

  const projectRoot = findProjectRoot();
  const prismaDir = path.join(projectRoot, "prisma");
  mkdirSync(prismaDir, { recursive: true });

  return `file:${path.join(prismaDir, "dev.db")}`;
}

function findProjectRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "prisma", "schema.prisma"))) return cwd;

  const workspaceApp = path.join(cwd, "apps", "next-fullstack");
  if (existsSync(path.join(workspaceApp, "prisma", "schema.prisma"))) return workspaceApp;

  return cwd;
}
