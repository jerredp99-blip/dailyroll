import { Redis } from "@upstash/redis";

const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
const url = rawUrl && rawUrl.startsWith("https://") ? rawUrl : "https://dummy.upstash.io";
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "dummy";

export const redis = new Redis({
  url,
  token,
});

