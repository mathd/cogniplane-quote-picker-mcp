import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Bundles index.html, its script and its CSS into one dist/index.html file.
export default defineConfig({ plugins: [viteSingleFile()] });
