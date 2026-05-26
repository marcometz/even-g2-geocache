import { spawn } from "node:child_process";

/**
 * Resolve the simulator target URL from CLI args or fallback value.
 * @param {string[]} argv
 * @param {string} fallbackUrl
 * @returns {string}
 */
export function parseTargetUrl(argv, fallbackUrl = "http://localhost:5173") {
  const candidate = argv[2]?.trim();
  return candidate?.length ? candidate : fallbackUrl;
}

/**
 * Validate that a URL can be loaded before launching the simulator.
 * @param {string} targetUrl
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 * @returns {Promise<void>}
 */
export async function assertUrlReachable(targetUrl, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 2500;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(targetUrl, {
      method: "HEAD",
      signal: controller.signal
    });

    if (!response?.ok) {
      throw new Error(`HTTP ${response?.status ?? "unknown"}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach ${targetUrl}. Start the web server first (npm start), then run the simulator. (${message})`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Spawn the EvenHub simulator and mirror its exit code.
 * @param {string} targetUrl
 * @returns {Promise<number>}
 */
export function runSimulator(targetUrl) {
  return new Promise((resolve, reject) => {
    const processHandle = spawn("evenhub-simulator", [targetUrl], { stdio: "inherit" });

    processHandle.on("error", (error) => {
      reject(
        new Error(
          `Failed to start evenhub-simulator. Install it with: npm install -g @evenrealities/evenhub-simulator (${error.message})`
        )
      );
    });

    processHandle.on("exit", (code) => {
      resolve(code ?? 1);
    });
  });
}

/**
 * CLI entrypoint.
 * @returns {Promise<void>}
 */
async function main() {
  const targetUrl = parseTargetUrl(process.argv);

  try {
    await assertUrlReachable(targetUrl);
    const exitCode = await runSimulator(targetUrl);
    process.exitCode = exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[simulator] ${message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
