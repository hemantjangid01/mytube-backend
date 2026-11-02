
import redisClient from "../db/redis.js";

export const getOrSetCache = async (
  key,
  fetchData,
  ttlSeconds = 30
) => {
  try {
    const cachedData = await redisClient.get(key);

    if (cachedData !== null) {
      try {
        console.log("REDIS CACHE HIT:", key);
        return JSON.parse(cachedData);
      } catch {
        console.error("Invalid cached JSON:", key);
        await redisClient.del(key);
      }
    }
  } catch (error) {
    console.error("Redis cache read failed:", error.message);
  }

  console.log("REDIS CACHE MISS:", key);

  const data = await fetchData();

  try {
    await redisClient.set(
      key,
      JSON.stringify(data),
      { EX: ttlSeconds }
    );
  } catch (error) {
    console.error("Redis cache write failed:", error.message);
  }

  return data;
};

export const getCacheVersion = async (versionKey) => {
  try {
    let version = await redisClient.get(versionKey);

    if (version === null) {
      await redisClient.set(versionKey, "1", { NX: true });
      version = await redisClient.get(versionKey);
    }

    return version || "1";
  } catch (error) {
    console.error("Redis version read failed:", error.message);
    return null;
  }
};

export const invalidateCacheVersion = async (versionKey) => {
  try {
    await redisClient.incr(versionKey);
    console.log("CACHE INVALIDATED:", versionKey);
    return true;
  } catch (error) {
    console.error(
      "Cache invalidation failed:",
      error.message
    );
    return false;
  }
};
