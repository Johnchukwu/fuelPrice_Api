

import { createApp } from "./app"
import { connectMongo } from "./db/mongoose"
import { env } from "./config/env"
import { logger } from "./observability/logger"

async function main() {
  await connectMongo()
  const app = createApp()
  app.listen(env.PORT, () => logger.info(`listening on ${env.PORT}`))
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
