import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} layerDir
 * @param {string[]} pkgSegments
 */
async function importLayerEntry(layerDir, pkgSegments) {
    const entry = path.join(
        ROOT,
        ".serverless",
        "layers",
        layerDir,
        "nodejs",
        "node_modules",
        ...pkgSegments,
        "build",
        "index.js",
    );
    return import(pathToFileURL(entry).href);
}

/**
 * @param {string} layerDir
 * @param {string} pkgName
 */
async function assertLayerPackagePresent(layerDir, pkgName) {
    const pkgPath = path.join(
        ROOT,
        ".serverless",
        "layers",
        layerDir,
        "nodejs",
        "node_modules",
        ...pkgName.split("/"),
        "package.json",
    );
    const { access } = await import("node:fs/promises");
    await access(pkgPath);
}

/**
 * @param {string} lang
 */
async function assertGameslibLocaleBundlesPresent(lang) {
    const { access } = await import("node:fs/promises");
    for (const namespace of ["apgames", "apresults"]) {
        await access(path.join(
            ROOT,
            ".serverless",
            "layers",
            "abstractplay-gameslib",
            "nodejs",
            "node_modules",
            "@abstractplay",
            "gameslib",
            "locales",
            lang,
            `${namespace}.json`,
        ));
    }
}

try {
    const gl = await importLayerEntry("abstractplay-gameslib", ["@abstractplay", "gameslib"]);
    if (!gl.gameinfo || typeof gl.GameFactory !== "function") {
        throw new Error("@abstractplay/gameslib missing expected exports");
    }
    for (const lang of ["en", "fr", "de", "it", "es-US", "eo"]) {
        await assertGameslibLocaleBundlesPresent(lang);
    }

    const rr = await importLayerEntry("abstractplay-gameslib", ["@abstractplay", "recranks"]);
    if (typeof rr.Glicko2 !== "function" || typeof rr.ELOBasic !== "function") {
        throw new Error("@abstractplay/recranks missing expected exports");
    }

    const renderer = await importLayerEntry("abstractplay-renderer", ["@abstractplay", "renderer"]);
    if (typeof renderer.addPrefix !== "function") {
        throw new Error("@abstractplay/renderer addPrefix missing after layer import");
    }

    await assertLayerPackagePresent("abstractplay-chromium", "puppeteer-core");
    await assertLayerPackagePresent("abstractplay-chromium", "@sparticuz/chromium");

    console.log("smoke-layer-modules: gameslib locales + modules + renderer + chromium layers OK");
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`smoke-layer-modules: ${message}`);
    process.exit(1);
}
