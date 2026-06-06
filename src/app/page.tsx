"use client";

import { BrowserProvider } from "ethers";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";

import { ThemedLogo } from "@/components/themed-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  generateDynamicQR,
  getSignatureWindowTimestamp,
} from "@/lib/dynamicQr";

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
  const lastSignedWindowRef = useRef<{
    tokenId: number;
    timestamp: number;
  } | null>(null);
  const controlsSectionRef = useRef<HTMLElement | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const facePrice = Number(facePriceInput || 0);
  const maxResale = useMemo(
    () => facePrice * (1 + MARKUP_BPS / 10000),
    [facePrice],
  );
  const listPrice = Number(listPriceInput || 0);
  const royalty = useMemo(() => listPrice * (ROYALTY_BPS / 10000), [listPrice]);
  const sellerNet = useMemo(() => listPrice - royalty, [listPrice, royalty]);

  // Guided step state keeps first-time visitors on a single linear flow.
  const hasTicket = ticket !== null;
  const hasListedTicket = hasTicket && ticket.listedPriceUsd !== null;
  const flowStep = !hasTicket ? 1 : !hasListedTicket ? 2 : 3;
  const flowHint = !isConnected
    ? "Connect wallet first, then follow Step 1 to Step 3."
    : flowStep === 1
    ? "Start with Create ticket to initialize the flow."
    : flowStep === 2
    ? "Great. Continue with Set resale price."
    : "Final step: Complete sale to see payout routing.";

  useEffect(() => {
    if (!ticket || !isConnected) {
      lastSignedWindowRef.current = null;
      return;
    }

    // Regenerate signed QR only when the signature window changes.
    const run = async () => {
      try {
        if (!window.ethereum) {
          setQrError("No wallet provider found in this browser.");
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const signingTimestamp = getSignatureWindowTimestamp(now);
        const latestWindow = lastSignedWindowRef.current;

        if (
          latestWindow &&
          latestWindow.tokenId === ticket.tokenId &&
          latestWindow.timestamp === signingTimestamp &&
          qrPayload
        ) {
          setQrError("");
          return;
        }

        const provider = new BrowserProvider(window.ethereum as never);
        const signer = await provider.getSigner();
        const payload = await generateDynamicQR(
          ticket.tokenId,
          signer,
          signingTimestamp,
        );
        setQrPayload(payload);
        lastSignedWindowRef.current = {
          tokenId: ticket.tokenId,
          timestamp: signingTimestamp,
        };
        setQrError("");
      } catch (error) {
        console.error(error);
        setQrError(
          "Could not sign the QR session. Ensure your wallet is unlocked.",
        );
      }
    };

    void run();
    const interval = window.setInterval(() => void run(), 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [ticket, isConnected, qrPayload]);

  const addLog = (line: string) => {
    // Keep activity feed concise and focused on the latest actions.
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

  const copyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch (error) {
      console.error(error);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const scrollToControls = () => {
    controlsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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

    // Demo-only token generation for UI simulation.
    const newTicket: DemoTicket = {
      tokenId: Math.floor(Math.random() * 900000) + 100000,
      facePriceUsd: parsedPrice,
      listedPriceUsd: null,
      mintedAt: Date.now(),
    };

    setTicket(newTicket);
    addLog(
      `Minted ticket #${newTicket.tokenId} at face value $${parsedPrice.toFixed(
        2,
      )}.`,
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

    // Enforce resale cap before moving ticket into the listed state.
    const allowedCap = ticket.facePriceUsd * (1 + MARKUP_BPS / 10000);
    if (parsedListPrice > allowedCap) {
      addLog(
        `Rejected by rule: $${parsedListPrice.toFixed(
          2,
        )} exceeds cap $${allowedCap.toFixed(2)}.`,
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
      `Sale complete. Organizer receives $${payoutRoyalty.toFixed(
        2,
      )} royalty. Seller receives $${payoutSeller.toFixed(2)}.`,
    );

    // Reset flow after a completed sale so the next run starts from Step 1.
    setTicket(null);
    setQrPayload("");
    setQrError("");
  };

  const walletLabel = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Not connected";
  const currentYear = new Date().getFullYear();

  return (
    <main className="app-shell">
      {/* Header actions: theme, wallet, network state and brand entry point. */}
      <div className="topbar">
        <div className="brand-logo">
          <ThemedLogo className="h-24 w-auto md:h-28" />
        </div>
        <div className="topbar-right">
          <div className="topbar-theme">
            <ThemeToggle />
          </div>
          <div className="topbar-actions">
            {isConnected ? (
              <div className="wallet-topbar">
                <button
                  onClick={() => void copyAddress()}
                  className="wallet-inline-button"
                >
                  <span className="wallet-inline-dot" />
                  {copyState === "copied"
                    ? "Copied"
                    : copyState === "failed"
                    ? "Retry"
                    : walletLabel}
                </button>

                {chainId !== baseSepolia.id && (
                  <button
                    onClick={ensureBaseSepolia}
                    className="glass-button glass-button-primary px-4 py-2 text-sm font-semibold"
                  >
                    Switch network
                  </button>
                )}

                <button
                  onClick={() => disconnect()}
                  className="glass-button px-4 py-2 text-sm font-semibold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="glass-button glass-button-primary px-4 py-2 text-sm font-semibold"
              >
                Connect wallet
              </button>
            )}
          </div>
        </div>
      </div>

      <section>
        {/* Hero communicates value proposition and primary user intents. */}
        <article className="card-surface hero-surface motion-delay-1 rounded-[1.75rem] p-6 md:p-8">
          <div className="hero-grid hero-grid-compact">
            <div className="hero-main">
              <div className="glass-chip hero-chip text-sm text-[var(--foreground)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                Fair resale. Verified entry. Better fan trust.
              </div>

              <h1 className="hero-title mt-5 text-4xl font-semibold leading-tight md:text-6xl">
                Ticket resale that protects fans, respects organizers, and holds
                up at the gate.
              </h1>

              <p className="hero-copy muted mt-5 text-base leading-8 md:text-[1.05rem]">
                Decentratix brings capped resale pricing, automatic royalties,
                and rotating entry QR codes into one experience built for modern
                event teams and their audiences.
              </p>

              <div className="hero-actions mt-6 flex flex-wrap gap-3">
                <button
                  onClick={scrollToControls}
                  className="glass-button glass-button-primary hero-primary-action px-5 py-3 text-sm font-semibold"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                  >
                    <path d="M4 8h16v8H4z" />
                    <path d="M9 8V6h6v2" />
                    <path d="M8 12h.01M16 12h.01" />
                  </svg>
                  Get started
                </button>

                <Link
                  href="/scanner"
                  className="glass-button hero-secondary-action px-5 py-3 text-sm font-semibold"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                  >
                    <path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3" />
                    <path d="M7 12h10" />
                  </svg>
                  Open gate scanner
                </Link>
              </div>
            </div>

            <aside className="hero-side panel hero-side-panel">
              <div className="hero-side-head">
                <p className="section-kicker muted text-xs font-semibold uppercase tracking-[0.16em]">
                  Core rules
                </p>
                <p className="hero-side-eyebrow">Always enforced on resale</p>
              </div>

              <div className="stat-ribbon hero-stat-ribbon mt-5">
                <div className="stat-pill">
                  <span className="hero-stat-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 3v18" />
                      <path d="M17 7.5c0-1.4-2.2-2.5-5-2.5S7 6.1 7 7.5 9.2 10 12 10s5 1.1 5 2.5S14.8 15 12 15s-5 1.1-5 2.5" />
                    </svg>
                  </span>
                  <span className="hero-stat-copy">
                    <span className="stat-pill-label">Resale cap</span>
                    <span className="stat-pill-value">10% max markup</span>
                  </span>
                </div>
                <div className="stat-pill">
                  <span className="hero-stat-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M4 7h16" />
                      <path d="M7 12h10" />
                      <path d="M10 17h4" />
                    </svg>
                  </span>
                  <span className="hero-stat-copy">
                    <span className="stat-pill-label">Royalty routing</span>
                    <span className="stat-pill-value">5% per resale</span>
                  </span>
                </div>
                <div className="stat-pill">
                  <span className="hero-stat-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3" />
                      <path d="M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z" />
                    </svg>
                  </span>
                  <span className="hero-stat-copy">
                    <span className="stat-pill-label">Entry security</span>
                    <span className="stat-pill-value">
                      QR refresh every 15s
                    </span>
                  </span>
                </div>
              </div>

              <div className="mini-feature-row hero-mini-feature-row mt-5">
                <div className="mini-feature">
                  <div className="hero-feature-head">
                    <span className="hero-feature-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4 8h16v8H4z" />
                        <path d="M9 8V6h6v2" />
                      </svg>
                    </span>
                    <span className="mini-feature-kicker">Access</span>
                  </div>
                  <p>
                    Issue tickets and manage actions from one connected wallet.
                  </p>
                </div>
                <div className="mini-feature">
                  <div className="hero-feature-head">
                    <span className="hero-feature-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M12 3v18" />
                        <path d="M17 7.5c0-1.4-2.2-2.5-5-2.5S7 6.1 7 7.5 9.2 10 12 10s5 1.1 5 2.5S14.8 15 12 15s-5 1.1-5 2.5" />
                      </svg>
                    </span>
                    <span className="mini-feature-kicker">Resale</span>
                  </div>
                  <p>
                    Keep pricing inside clear limits while routing royalties
                    automatically.
                  </p>
                </div>
                <div className="mini-feature">
                  <div className="hero-feature-head">
                    <span className="hero-feature-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3" />
                        <path d="M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z" />
                      </svg>
                    </span>
                    <span className="mini-feature-kicker">Entry</span>
                  </div>
                  <p>
                    Use rotating QR validation to reject reused screenshots at
                    the gate.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </article>
      </section>

      <section ref={controlsSectionRef} className="mt-5" id="ticket-controls">
        {/* Main interaction surface for ticket issuance, listing and sale simulation. */}
        <article className="card-surface showcase-surface motion-delay-2 rounded-[1.5rem] p-6 md:p-8">
          <div className="showcase-grid">
            <div className="control-stack">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-kicker muted text-xs font-semibold uppercase tracking-[0.16em]">
                    Ticket controls
                  </p>
                  <h2 className="section-title mt-2 text-2xl font-semibold">
                    Set rules for pricing and entry
                  </h2>
                  <p className="flow-hint muted mt-3 text-sm">{flowHint}</p>
                </div>
                <div className="wallet-badge">Step {flowStep} of 3</div>
              </div>

              <div className="flow-steps mt-4">
                <div
                  className={`flow-step ${flowStep >= 1 ? "is-active" : ""}`}
                >
                  1. Create ticket
                </div>
                <div
                  className={`flow-step ${flowStep >= 2 ? "is-active" : ""}`}
                >
                  2. Set resale price
                </div>
                <div
                  className={`flow-step ${flowStep >= 3 ? "is-active" : ""}`}
                >
                  3. Complete sale
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="muted block text-xs font-semibold uppercase tracking-[0.1em]">
                  Original price
                  <input
                    type="number"
                    min="1"
                    value={facePriceInput}
                    onChange={(event) => setFacePriceInput(event.target.value)}
                    className="input-field mt-2 w-full rounded-2xl px-4 py-3 text-base outline-none"
                  />
                </label>

                <label className="muted block text-xs font-semibold uppercase tracking-[0.1em]">
                  Resale price
                  <input
                    type="number"
                    min="1"
                    value={listPriceInput}
                    onChange={(event) => setListPriceInput(event.target.value)}
                    className="input-field mt-2 w-full rounded-2xl px-4 py-3 text-base outline-none"
                  />
                </label>
              </div>

              <div className="soft-accent premium-accent-panel mt-5 rounded-[1.25rem] border border-[var(--line)] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Rules engine</p>
                  <div className="wallet-badge">Always visible</div>
                </div>
                <div className="rule-metrics grid gap-2 text-sm md:grid-cols-3">
                  <div className="rule-metric">
                    <p className="rule-metric-label muted">
                      Max allowed resale
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      ${maxResale.toFixed(2)}
                    </p>
                  </div>
                  <div className="rule-metric">
                    <p className="rule-metric-label muted">Organizer royalty</p>
                    <p className="mt-1 text-lg font-semibold">
                      ${royalty.toFixed(2)}
                    </p>
                  </div>
                  <div className="rule-metric">
                    <p className="rule-metric-label muted">Seller payout</p>
                    <p className="mt-1 text-lg font-semibold">
                      ${sellerNet.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="control-actions mt-5 grid gap-3 md:grid-cols-3">
                <button
                  onClick={registerTicket}
                  disabled={!isConnected}
                  className={`glass-button glass-button-primary px-4 py-3 text-sm font-semibold ${
                    !isConnected ? "flow-button-disabled" : ""
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                  >
                    <path d="M4 8h16v8H4z" />
                    <path d="M9 8V6h6v2" />
                  </svg>
                  Create ticket
                </button>
                <button
                  onClick={listTicket}
                  disabled={!hasTicket}
                  className={`glass-button px-4 py-3 text-sm font-semibold ${
                    !hasTicket ? "flow-button-disabled" : ""
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                  >
                    <path d="M4 7h16" />
                    <path d="M7 12h10" />
                    <path d="M10 17h4" />
                  </svg>
                  Set resale price
                </button>
                <button
                  onClick={simulateSale}
                  disabled={!hasListedTicket}
                  className={`glass-button px-4 py-3 text-sm font-semibold ${
                    !hasListedTicket ? "flow-button-disabled" : ""
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                  >
                    <path d="M12 3v18" />
                    <path d="M17 8.5c0-1.4-2.2-2.5-5-2.5s-5 1.1-5 2.5S9.2 11 12 11s5 1.1 5 2.5S14.8 16 12 16s-5-1.1-5-2.5" />
                  </svg>
                  Complete sale
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-kicker muted text-xs font-semibold uppercase tracking-[0.16em]">
                    Ticket preview
                  </p>
                  <h2 className="section-title mt-2 text-2xl font-semibold">
                    Live entry QR
                  </h2>
                </div>
                <div className="wallet-badge">Signs once per 5m</div>
              </div>

              <div className="panel qr-stage mt-5 flex min-h-[320px] flex-col items-center justify-center rounded-[1.25rem] px-5 py-6">
                {ticket && qrPayload && isConnected ? (
                  <>
                    <div className="float-card rounded-[1.5rem] bg-white p-4 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.8)]">
                      <QRCodeSVG value={qrPayload} size={210} includeMargin />
                    </div>
                    <p className="mt-4 text-sm font-semibold">
                      Ticket #{ticket.tokenId}
                    </p>
                    <p className="muted mt-1 text-center text-sm">
                      This QR now refreshes in signed 5-minute windows to reduce
                      wallet prompts while still protecting entry checks.
                    </p>
                  </>
                ) : (
                  <div className="max-w-xs text-center">
                    <p className="text-base font-semibold">
                      Your live entry ticket appears here
                    </p>
                    <p className="muted mt-2 text-sm leading-6">
                      Issue a ticket to generate a rotating QR tied to the
                      current wallet owner.
                    </p>
                  </div>
                )}

                {qrError && (
                  <p className="mt-4 text-center text-xs text-[var(--danger-text)]">
                    {qrError}
                  </p>
                )}
              </div>

              <div className="qr-note-row mt-5">
                <div className="qr-note">Freshness check</div>
                <div className="qr-note">Owner match</div>
                <div className="qr-note">Anti-screenshot entry</div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5">
        {/* Supporting proof points and live activity stream for product storytelling. */}
        <article className="card-surface summary-surface motion-delay-2 rounded-[1.5rem] p-6 md:p-8">
          <div className="summary-grid">
            <div>
              <p className="section-kicker muted text-xs font-semibold uppercase tracking-[0.16em]">
                Live activity
              </p>
              <h3 className="section-title mt-2 text-2xl font-semibold">
                What is happening now
              </h3>
              <div className="summary-stream mt-5 space-y-3">
                {log.length === 0 ? (
                  <div className="summary-item">
                    <p className="muted text-sm">
                      Ticket issuance, resale actions, and entry events appear
                      here as they happen.
                    </p>
                  </div>
                ) : (
                  log.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className="summary-item font-mono text-xs leading-6"
                    >
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="section-kicker muted text-xs font-semibold uppercase tracking-[0.16em]">
                Product value
              </p>
              <h3 className="section-title mt-2 text-2xl font-semibold">
                Built for modern ticket operations
              </h3>
              <div className="benefit-list mt-5">
                <div className="benefit-row">
                  <div>
                    <p className="benefit-title">Buyer protection</p>
                    <p className="muted text-sm leading-6">
                      Price caps reduce scalping pressure and keep resale prices
                      closer to face value.
                    </p>
                  </div>
                </div>
                <div className="benefit-row">
                  <div>
                    <p className="benefit-title">Organizer revenue</p>
                    <p className="muted text-sm leading-6">
                      Verified resales can route royalties back to the event
                      team automatically.
                    </p>
                  </div>
                </div>
                <div className="benefit-row">
                  <div>
                    <p className="benefit-title">Safer entry</p>
                    <p className="muted text-sm leading-6">
                      Live validation checks current ownership instead of
                      trusting static PDFs or screenshots.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <footer className="site-footer">
        <p>Copyright © {currentYear} Decentratix. All rights reserved.</p>
        <p>
          A product from{" "}
          <a
            href="https://hedigardi.com"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            hedigardi.com
          </a>
        </p>
      </footer>
    </main>
  );
}
