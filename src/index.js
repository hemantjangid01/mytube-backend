import "dotenv/config";

import dns from "dns";
import connectDB from "./db/index.js";
import { connectRedis } from "./db/redis.js";
import { app } from "./app.js";
import { startEmailWorker } from "./workers/email.worker.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const startServer = async () => {
  try {
    await connectDB();

    await connectRedis();

    // Start BullMQ worker in the same backend process.
    startEmailWorker();

    app.on("error", (error) => {
      console.error("Express error:", error);
    });

    const PORT = process.env.PORT || 8000;

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("SERVER STARTUP FAILED:", error);
    process.exit(1);
  }
};

startServer();