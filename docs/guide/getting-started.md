# Getting Started

Welcome to Stockbud! This guide will help you set up your environment and connect your first store.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- A Shopify Partner account (if developing Shopify features)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Nabil201-ctrl/Stockbud.git
   cd Stockbud
   ```

2. Start the development environment:
   ```bash
   docker-compose up -d
   ```

3. Initialize the backend:
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

## Connecting your first store

Stockbud supports two types of stores:
- **Shopify Stores**: Full integration via the Shopify App Store.
- **Social Stores**: Virtual storefronts for WhatsApp and Instagram.

To connect a Shopify store, navigate to the **Stores** tab in your dashboard and follow the "Connect Store" flow.
