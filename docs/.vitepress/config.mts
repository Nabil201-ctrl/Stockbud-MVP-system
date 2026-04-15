import { defineConfig } from 'vitepress'

export default defineConfig({
    title: "Stockbud Docs",
    description: "Unified Retail Intelligence Documentation",
    themeConfig: {
        logo: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/bar-chart-3.svg',
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'API Reference', link: '/api/' }
        ],
        sidebar: [
            {
                text: 'Introduction',
                items: [
                    { text: 'Getting Started', link: '/guide/getting-started' },
                    { text: 'System Architecture', link: '/guide/architecture' },
                ]
            },
            {
                text: 'Core Features',
                items: [
                    { text: 'Shopify Integration', link: '/guide/shopify' },
                    { text: 'Social Stores', link: '/guide/social' },
                    { text: 'Inventory Management', link: '/guide/inventory' },
                ]
            },
            {
                text: 'Development',
                items: [
                    { text: 'Backend OS', link: '/guide/backend-os' },
                    { text: 'Deployment', link: '/guide/deployment' },
                ]
            }
        ],
        socialLinks: [
            { icon: 'github', link: 'https://github.com/Nabil201-ctrl/Stockbud-MVP-system' }
        ],
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2026 Stockbud'
        }
    },
    appearance: 'dark'
})
