

export const loader = async () => {
    return new Response(
        JSON.stringify({
            status: "ok",
            app: "stockbud_shopify_app",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV,
        }),
        {
            status: 200,
            headers: {
                "Cache-Control": "no-store, max-age=0",
                "Content-Type": "application/json",
            },
        }
    );
};
