# Decentratix

Decentratix is a portfolio-ready Web3 ticketing demo built with React, Next.js, TypeScript, Solidity, and Wagmi.

It demonstrates three core ideas:

- Fair resale caps to reduce scalping incentives.
- Automatic organizer royalties on every secondary sale.
- Dynamic, signed QR payloads to reduce screenshot/replay fraud.

## Core Rules

- Resale cap rule:

  `P_resell <= P_face * (1 + alpha)`

- Organizer royalty rule:

  `R_artist = P_resell * beta`

Current demo contract defaults:

- `alpha = 10%` (`1000` basis points)
- `beta = 5%` (`500` basis points)

## Project Structure

- `src/` Next.js frontend source (App Router, TypeScript, Wagmi)
- `public/` Frontend static assets
- `contracts/` Solidity smart contract (`Decentratix.sol`)
- `scripts/` Hardhat deploy scripts

## Smart Contract Features

- ERC-721 ticket ownership.
- Secondary listing with max markup enforcement.
- On-chain royalty split to organizer wallet.
- Scanner-restricted `scanAndLockTicket` entry lock.
- Transfer restrictions: direct wallet-to-wallet transfer is blocked to force market rules.

## Frontend Features

- Wallet connect and Base Sepolia switch.
- Ticket registration and resale cap simulation.
- Dynamic QR generation with ECDSA signatures (refresh every 15s).
- Mobile scanner view in `/scanner` for timestamp + signature + owner checks.

## Getting Started

### 1. Install dependencies

In repo root:

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` in the repo root and fill values for deployment.

Create `.env.local` in the root with:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContract
NEXT_PUBLIC_BASE_RPC_URL=https://sepolia.base.org
```

### 3. Run frontend locally

```bash
npm run dev
```

Open:

- `http://localhost:3000/` for the demo dApp
- `http://localhost:3000/scanner` for gate scanner mode

## Compile and Deploy Contract

Compile:

```bash
npm run compile
```

Deploy to Base Sepolia:

```bash
npm run deploy:base
```

Verify contract on Basescan:

```bash
npm run verify:base -- <DEPLOYED_ADDRESS> "Decentratix Event" "TIX" "<ORGANIZER_ADDR>" "<SCANNER_ADDR>" 1000 500
```

## Scanner Verification Flow

When the scanner reads a QR payload, it verifies:

1. Payload age is less than or equal to 30 seconds.
2. Signature recovers the expected wallet address.
3. Recovered address equals `ownerOf(tokenId)` on-chain.
4. Contract accepts `scanAndLockTicket(tokenId)` for one-time entry.

## Notes

- This repo contains a simulation-first UI for portfolio demonstration.
- For production, add stronger anti-bot controls, scanner operator auth, and a resilient backend/event indexer.
