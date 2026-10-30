import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treasureb0x",
    short_name: "Treasureb0x",
    description: "Hunts, clues, and prizes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#0f766e",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
