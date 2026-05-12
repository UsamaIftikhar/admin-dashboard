import app from "../artifacts/api-server/src/app";
import { seedProducts } from "../artifacts/api-server/src/lib/productSeed";
import { logger } from "../artifacts/api-server/src/lib/logger";

let seedPromise: Promise<void> | undefined;
const expressHandler = app as unknown as (
  request: any,
  response: any,
) => void;

async function ensureSeeded() {
  seedPromise ??= seedProducts().catch((error) => {
    seedPromise = undefined;
    throw error;
  });

  await seedPromise;
}

export default async function handler(
  request: any,
  response: any,
) {
  try {
    await ensureSeeded();
  } catch (error) {
    logger.error({ err: error }, "Failed to seed products");
    response.statusCode = 500;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: "Failed to initialize API" }));
    return;
  }

  return expressHandler(request, response);
}
