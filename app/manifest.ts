import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dailyroll | Bonus tracker",
    short_name: "dailyroll",
    description: "Keep your daily sweepstakes casino bonuses in one place.",
    start_url: "/tracker",
    display: "standalone",
    background_color: "#101815",
    theme_color: "#101815",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
