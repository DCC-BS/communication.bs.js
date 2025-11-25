import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "@dcc-bs/commmunication.bs.js",
            fileName: "communication.bs",
            formats: ["es", "umd"], // Specify browser-compatible formats
        },
        // Include CSS in the build
        cssCodeSplit: false,
        // Copy CSS files to dist
        copyPublicDir: false,
        target: "esnext", // Target modern browsers
        minify: true,
    },
    define: {
        // Ensure browser environment
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
    plugins: [dts({ rollupTypes: true })],
});
