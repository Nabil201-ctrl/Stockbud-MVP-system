import { NextResponse } from 'next/server';

/**
 * Basic metrics endpoint to satisfy Prometheus scraping
 * and prevent 404 logs in the terminal.
 */
export async function GET() {
  const uptime = process.uptime();
  const metrics = `
# HELP node_uptime_seconds The uptime of the node process in seconds.
# TYPE node_uptime_seconds gauge
node_uptime_seconds ${uptime}

# HELP site_status Status of the catalog site (1 = up)
# TYPE site_status gauge
site_status 1
`.trim();

  return new NextResponse(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  });
}
