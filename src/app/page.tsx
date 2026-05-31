"use client";

import { BrowserProvider } from "ethers";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";

import { generateDynamicQR } from "@/lib/dynamicQr";

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

interface DemoTicket {
  tokenId: number;
  facePriceUsd: number;
  listedPriceUsd: number | null;
  mintedAt: number;
}

const MARKUP_BPS = 1000;
const ROYALTY_BPS = 500;

export default function HomePage() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const [facePriceInput, setFacePriceInput] = useState("120");
  const [listPriceInput, setListPriceInput] = useState("130");
  const [ticket, setTicket] = useState<DemoTicket | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [qrPayload, setQrPayload] = useState<string>("");
  const [qrError, setQrError] = useState<string>("");

  const facePrice = Number(facePriceInput || 0);
  const maxResale = useMemo(
    () => facePrice * (1 + MARKUP_BPS / 10000),
    [facePrice],
  );
  const listPrice = Number(listPriceInput || 0);
  const royalty = useMemo(() => listPrice * (ROYALTY_BPS / 10000), [listPrice]);
  const sellerNet = useMemo(() => listPrice - royalty, [listPrice, royalty]);

  useEffect(() => {
    if (!ticket || !isConnected) return;

    const run = async () => {
      try {
        if (!window.ethereum) {
          setQrError("No wallet provider found in this browser.");
          return;
        }

        const provider = new BrowserProvider(window.ethereum as never);
        const signer = await provider.getSigner();
        const payload = await generateDynamicQR(ticket.tokenId, signer);
        setQrPayload(payload);
        setQrError("");
      } catch (error) {
        console.error(error);
        setQrError(
          "Could not sign a dynamic QR payload. Ensure your wallet is unlocked.",
        );
      }
    };

    void run();
    const interval = window.setInterval(() => void run(), 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [ticket, isConnected]);

  const addLog = (line: string) => {
    setLog((current) => [line, ...current].slice(0, 6));
  };

  const connectWallet = async () => {
    const injectedConnector = connectors[0];
    if (!injectedConnector) {
      addLog("No injected wallet detected.");
      return;
    }

    connect({ connector: injectedConnector });
  };

  const ensureBaseSepolia = () => {
    if (chainId !== baseSepolia.id) {
      switchChain({ chainId: baseSepolia.id });
      addLog("Switched chain to Base Sepolia.");
    }
  };

  const registerTicket = () => {
    if (!isConnected) {
      addLog("Connect wallet before registering a ticket.");
      return;
    }

    const parsedPrice = Number(facePriceInput);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      addLog("Face price must be a valid positive number.");
      return;
    }

    const newTicket: DemoTicket = {
      tokenId: Math.floor(Math.random() * 900000) + 100000,
      facePriceUsd: parsedPrice,
      listedPriceUsd: null,
      mintedAt: Date.now(),
    };

    setTicket(newTicket);
    addLog(
      `Minted demo ticket #${newTicket.tokenId} at face value $${parsedPrice.toFixed(2)}.`,
    );
  };

  const listTicket = () => {
    if (!ticket) {
      addLog("Register a ticket first.");
      return;
    }

    const parsedListPrice = Number(listPriceInput);
    if (Number.isNaN(parsedListPrice) || parsedListPrice <= 0) {
      addLog("Listing price must be a valid positive number.");
      return;
    }

    const allowedCap = ticket.facePriceUsd * (1 + MARKUP_BPS / 10000);
    if (parsedListPrice > allowedCap) {
      addLog(
        `Rejected by rule: $${parsedListPrice.toFixed(2)} exceeds cap $${allowedCap.toFixed(2)}.`,
      );
      return;
    }

    setTicket({ ...ticket, listedPriceUsd: parsedListPrice });
    addLog(
      `Ticket #${ticket.tokenId} listed for $${parsedListPrice.toFixed(2)}.`,
    );
  };

  const simulateSale = () => {
    if (!ticket || ticket.listedPriceUsd === null) {
      addLog("Ticket is not listed for resale.");
      return;
    }

    const payoutRoyalty = ticket.listedPriceUsd * (ROYALTY_BPS / 10000);
    const payoutSeller = ticket.listedPriceUsd - payoutRoyalty;
    addLog(
      `Sale complete. Organizer receives $${payoutRoyalty.toFixed(2)} royalty. Seller receives $${payoutSeller.toFixed(2)}.`,
    );
  };

  return (
    <>
      <div className="grain" />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:py-12">
        <section className="reveal card-surface rounded-3xl p-6 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="inline-block rounded-full bg-black px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                Portfolio Build
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                Decentratix: fair resale tickets with anti-scalping rules.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-black/70 md:text-lg">
                This demo combines a capped resale policy, automatic organizer
                royalties, and dynamic signed QR tickets to stop replay and
                screenshot fraud.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2 rounded-2xl border border-black/15 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/60">
                Wallet
              </p>
              {isConnected ? (
                <>
                  <p className="font-mono text-xs">
                    {address?.slice(0, 8)}...{address?.slice(-6)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={ensureBaseSepolia}
                      className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white"
                    >
                      Base Sepolia
                    </button>
                    <button
                      onClick={() => disconnect()}
                      className="rounded-full border border-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em]"
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <article
            className="reveal card-surface rounded-3xl p-6"
            style={{ animationDelay: "80ms" }}
          >
            <h2 className="text-3xl font-black">Rule Engine Demo</h2>
            <p className="mt-2 text-sm text-black/65">
              Resale cap: P_resell ≤ P_face × (1 + α), where α = 10%. Royalty
              share β = 5%.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-black/65">
                Face Price (USD)
                <input
                  type="number"
                  min="1"
                  value={facePriceInput}
                  onChange={(event) => setFacePriceInput(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-base outline-none focus:border-black"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-[0.15em] text-black/65">
                Resale Price (USD)
                <input
                  type="number"
                  min="1"
                  value={listPriceInput}
                  onChange={(event) => setListPriceInput(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-base outline-none focus:border-black"
                />
              </label>

              <div className="rounded-xl border border-black/15 bg-black/5 p-4 text-sm">
                <p>Max allowed resale: ${maxResale.toFixed(2)}</p>
                <p>Royalty to organizer: ${royalty.toFixed(2)}</p>
                <p>Seller net payout: ${sellerNet.toFixed(2)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={registerTicket}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-black"
                >
                  Register Demo Ticket
                </button>
                <button
                  onClick={listTicket}
                  className="rounded-full border border-black/20 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em]"
                >
                  List Ticket
                </button>
                <button
                  onClick={simulateSale}
                  className="rounded-full bg-[var(--mint)] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-black"
                >
                  Simulate Buy
                </button>
              </div>
            </div>
          </article>

          <article
            className="reveal card-surface rounded-3xl p-6"
            style={{ animationDelay: "140ms" }}
          >
            <h2 className="text-3xl font-black">Dynamic QR Ticket</h2>
            <p className="mt-2 text-sm text-black/65">
              QR payload rotates every 15 seconds and is signed by the holder
              wallet.
            </p>

            <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-black/15 bg-white p-4">
              {ticket && qrPayload ? (
                <>
                  <QRCodeSVG value={qrPayload} size={220} includeMargin />
                  <p className="text-xs text-black/60">
                    Ticket #{ticket.tokenId}
                  </p>
                </>
              ) : (
                <p className="py-8 text-sm text-black/60">
                  Connect wallet and register a ticket to generate QR payload.
                </p>
              )}

              {qrError && (
                <p className="text-center text-xs text-red-600">{qrError}</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-black/15 bg-[var(--accent-soft)] p-4 text-xs">
              <p className="font-semibold">Scanner checks:</p>
              <p>1. Timestamp age ≤ 30 seconds.</p>
              <p>2. Signature recovery from payload hash.</p>
              <p>3. ownerOf(tokenId) equals signer address.</p>
              <p>4. scanAndLockTicket(tokenId) marks entry as consumed.</p>
            </div>

            <Link
              href="/scanner"
              className="mt-4 inline-flex rounded-full bg-black px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white"
            >
              Open Scanner View
            </Link>
          </article>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <article
            className="reveal card-surface rounded-3xl p-6"
            style={{ animationDelay: "200ms" }}
          >
            <h3 className="text-2xl font-black">Live Event Log</h3>
            <div className="mt-4 space-y-2 text-sm">
              {log.length === 0 ? (
                <p className="text-black/55">No events yet.</p>
              ) : (
                log.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className="rounded-lg bg-black/5 px-3 py-2 font-mono text-xs"
                  >
                    {line}
                  </p>
                ))
              )}
            </div>
          </article>

          <article
            className="reveal card-surface rounded-3xl p-6"
            style={{ animationDelay: "260ms" }}
          >
            <h3 className="text-2xl font-black">Architecture Layers</h3>
            <ul className="mt-4 space-y-3 text-sm text-black/80">
              <li>
                1. Solidity contract enforces capped resale, royalty routing,
                and transfer restrictions.
              </li>
              <li>
                2. Next.js + Wagmi frontend manages ticket lifecycle and wallet
                signing flows.
              </li>
              <li>
                3. Dedicated mobile scanner view verifies freshness and
                ownership before gate entry.
              </li>
            </ul>
          </article>
        </section>
      </main>
    </>
  );
}
