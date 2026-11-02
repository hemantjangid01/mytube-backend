
import redisClient from "../db/redis.js";

// Read cached data or fetch it from MongoDB.
export const getOrSetCache = async (
  key,
  fetchData,
  ttlSeconds = 60
) => {
  try {
    const cachedData = await redisClient.get(key);

    if (cachedData !== null) {
      console.log("REDIS CACHE HIT:", key);
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.error("Redis cache read failed:", error.message);
  }

  console.log("REDIS CACHE MISS:", key);

  // MongoDB remains the source of truth.
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

// Get the current version of a cache.
export const getCacheVersion = async (versionKey) => {
  try {
    let version = await redisClient.get(versionKey);

    if (version === null) {
      await redisClient.set(
        versionKey,
        "1",
        { NX: true }
      );

      version = await redisClient.get(versionKey);
    }

    return version || "1";
  } catch (error) {
    console.error("Redis version read failed:", error.message);
    return null;
  }
};

// Incrementing the version makes previous cache entries obsolete.
export const invalidateCacheVersion = async (versionKey) => {
  try {
    await redisClient.incr(versionKey);
    console.log("CACHE INVALIDATED:", versionKey);
  } catch (error) {
    console.error("Cache invalidation failed:", error.message);
  }
};
