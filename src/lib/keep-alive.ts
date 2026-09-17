/**
 * Render / Cloud Keep-Alive Service
 *
 * Prevents Render and other free-tier hosting platforms from going to sleep
 * due to 15 minutes of inactivity by issuing periodic lightweight health pings.
 *
 * Automatically detects Render's built-in `RENDER_EXTERNAL_URL` environment variable,
 * or user-configured `SERVER_URL` / `APP_URL` / `BACKEND_URL`.
 */

export interface KeepAliveConfig {
  url?: string;
  intervalMinutes?: number;
  enabled?: boolean;
}

let pingTimer: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive(config: KeepAliveConfig = {}) {
  // Determine target server URL
  const targetUrl =
    config.url ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.SERVER_URL ||
    process.env.APP_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL;

  // Determine if keep-alive should run
  const isExplicitlyDisabled = process.env.ENABLE_KEEP_ALIVE === 'false' || config.enabled === false;
  const isProduction = process.env.NODE_ENV === 'production';
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);

  if (isExplicitlyDisabled) {
    console.log('[Keep-Alive] Disabled via configuration.');
    return;
  }

  if (!targetUrl) {
    if (isProduction || isRender) {
      console.warn(
        '[Keep-Alive] Warning: Target URL not found. Set RENDER_EXTERNAL_URL or SERVER_URL in environment to enable self-ping.'
      );
    } else {
      console.log('[Keep-Alive] Skipping in development (no SERVER_URL provided).');
    }
    return;
  }

  // Ensure valid URL format
  const baseUrl = targetUrl.replace(/\/+$/, '');
  const healthEndpoint = `${baseUrl}/health`;
  const intervalMinutes = config.intervalMinutes || Number(process.env.KEEP_ALIVE_INTERVAL_MINUTES) || 10;
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[Keep-Alive] Initialized self-ping service for: ${healthEndpoint}`);
  console.log(`[Keep-Alive] Interval: Every ${intervalMinutes} minutes`);

  async function ping() {
    const startTime = Date.now();
    try {
      const response = await fetch(healthEndpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'StockPilot-KeepAlive/1.0',
          'Accept': 'application/json',
        },
        // Abort after 15 seconds
        signal: AbortSignal.timeout(15000),
      });

      const elapsed = Date.now() - startTime;
      if (response.ok) {
        console.log(`[Keep-Alive] Ping successful (${response.status}) in ${elapsed}ms at ${new Date().toISOString()}`);
      } else {
        console.warn(`[Keep-Alive] Ping returned non-200 status: ${response.status} in ${elapsed}ms`);
      }
    } catch (err: any) {
      console.error(`[Keep-Alive] Ping failed: ${err?.message || err}`);
    }
  }

  // Initial ping delay after server boots (e.g. 45 seconds)
  const initialDelayMs = 45 * 1000;
  const initialTimeout = setTimeout(() => {
    ping();
    // Start recurring interval
    pingTimer = setInterval(ping, intervalMs);
  }, initialDelayMs);

  // Allow Node process to exit gracefully if needed
  if (initialTimeout && typeof (initialTimeout as any).unref === 'function') {
    (initialTimeout as any).unref();
  }
}

export function stopKeepAlive() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
    console.log('[Keep-Alive] Service stopped.');
  }
}
