/**
 * Starts a local PostgreSQL server for development without installing Postgres.
 * Data persists in ./.pgdata. Stop with Ctrl+C.
 *
 *   npm run db:local
 *
 * If you already have Postgres (local, Docker, Neon, Vercel Postgres…), skip
 * this and point DATABASE_URL at it instead.
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";

const databaseDir = path.join(process.cwd(), ".pgdata");
const port = Number(process.env.LOCAL_DB_PORT ?? 54329);

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: true,
    onLog: () => {},
  });

  const fresh = !fs.existsSync(path.join(databaseDir, "PG_VERSION"));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase("dealan");

  console.log(`Postgres ready → postgresql://postgres:postgres@localhost:${port}/dealan`);

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
