
import { createClient } from "redis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is missing from environment variables");
}

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();

    const response = await redisClient.ping();

    console.log("Redis connected:", response);
  }
};

export default redisClient;
