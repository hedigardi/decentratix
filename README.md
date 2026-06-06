# Decentratix

Decentratix is a Web3 ticketing experience focused on fair resale and secure entry validation.

Live domain:
https://decentratix.hedigardi.com

## Product Overview

Decentratix demonstrates a ticketing model where secondary-market rules are transparent and enforceable:

- Resale caps reduce extreme markups
- Organizer royalties are routed on each valid resale
- Rotating signed QR payloads help prevent screenshot replay at the gate

Core pricing logic:

- Resale cap:
  $P_{resell} \le P_{face} \times (1 + \alpha)$
- Royalty:
  $R_{organizer} = P_{resell} \times \beta$

Current defaults:

- $\alpha = 10\%$ (1000 bps)
- $\beta = 5\%$ (500 bps)

## Feature Highlights

### Frontend

- Guided user flow: Create ticket -> Set resale price -> Complete sale
- Wallet connect + Base Sepolia switching
- Live QR preview using signed time windows
- Dedicated scanner interface at /scanner

### Smart Contract

- ERC-721 ticket ownership
- Capped resale enforcement
- Royalty split to organizer wallet
- Scanner lock via scanAndLockTicket
- Transfer restrictions outside approved market flow

## Tech Stack

- Next.js (App Router) + TypeScript
- Wagmi + Ethers
- Solidity + Hardhat
- QR rendering and scanner integration

## Repository Structure

- src: Next.js application code
- public: static assets, icons, manifest
- contracts: Solidity contracts
- scripts: deployment scripts

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create .env.local in the project root:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContract
NEXT_PUBLIC_BASE_RPC_URL=https://sepolia.base.org
```

### 3. Run locally

```bash
npm run dev
```

Local routes:

- http://localhost:3000/
- http://localhost:3000/scanner

## Contract Commands

Compile:

```bash
npm run compile
```

Deploy to Base Sepolia:

```bash
npm run deploy:base
```

Verify on BaseScan:

```bash
npm run verify:base -- <DEPLOYED_ADDRESS> "Decentratix Event" "TIX" "<ORGANIZER_ADDR>" "<SCANNER_ADDR>" 1000 500
```

## Netlify Deployment

This project is configured for Netlify deployment with Next.js support.

### Build settings

- Build command: npm run build
- Next.js runtime: auto-detected via @netlify/plugin-nextjs
- No manual publish directory is required for Next.js runtime deployments

### Environment variables on Netlify

Set these in Site settings -> Environment variables:

- NEXT_PUBLIC_CONTRACT_ADDRESS
- NEXT_PUBLIC_BASE_RPC_URL

If you deploy contracts from CI/CD, also consider:

- ORGANIZER_ADDRESS
- SCANNER_ADDRESS
- PRIVATE_KEY
- BASESCAN_API_KEY

## SEO and Launch Checklist

Before public launch, verify the following:

1. Metadata and canonical URLs

- Page title and description are correct on / and /scanner
- Canonical URLs resolve to https://decentratix.hedigardi.com

2. Crawl and indexing

- robots.txt is available at /robots.txt
- sitemap.xml is available at /sitemap.xml
- Submit sitemap to Google Search Console and Bing Webmaster Tools

3. Social previews

- Open Graph preview works in social debuggers
- Twitter card preview works and shows the generated image

4. Favicons and manifest

- favicon appears on desktop browsers
- site.webmanifest is reachable and valid

5. Performance and quality

- Run npm run lint and npm run build
- Validate mobile usability and core pages in production mode

## Security and Production Notes

Decentratix currently presents a product-grade demo flow. For a hardened production deployment, add:

- Scanner operator authorization and audit logging
- Dedicated backend/indexer for robust event ingestion
- Abuse protection and rate limits for public endpoints
- Monitoring, alerting, and incident response workflows
