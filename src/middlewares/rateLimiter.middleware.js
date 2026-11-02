
import redisClient from "../db/redis.js";

export const rateLimiter = ({
  windowSeconds = 60,
  maxRequests = 30,
  keyPrefix = "rate-limit",
}) => {
  return async (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;

    try {
      const requests = await redisClient.eval(
        `
          local current = redis.call("INCR", KEYS[1])

          if current == 1 then
            redis.call("EXPIRE", KEYS[1], ARGV[1])
          end

          return current
        `,
        {
          keys: [key],
          arguments: [String(windowSeconds)],
        }
      );

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, maxRequests - requests)
      );

      if (requests > maxRequests) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
      }

      return next();
    } catch (error) {
      console.error("Rate limiter Redis error:", error.message);

      // Fail open if Redis is unavailable.
      return next();
    }
  };
};
