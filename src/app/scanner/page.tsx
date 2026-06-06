"use client";

import { ethers } from "ethers";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWriteContract } from "wagmi";

import { ThemedLogo } from "@/components/themed-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CONTRACT_ADDRESS, DECENTRATIX_ABI } from "@/lib/abi";
import {
  parseQrPayload,
  QR_FRESHNESS_GRACE_SECONDS,
  QR_SIGNATURE_WINDOW_SECONDS,
} from "@/lib/dynamicQr";

type VerificationState = "idle" | "checking" | "valid" | "invalid" | "expired";

interface VerifiedTicket {
  tokenId: number;
  owner: string;
}

export default function TicketScannerPage() {
  const [verificationState, setVerificationState] =
    useState<VerificationState>("idle");
  const [ticketDetails, setTicketDetails] = useState<VerifiedTicket | null>(
    null,
  );
  const [isCameraActive, setIsCameraActive] = useState(false);

  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scannerRunningRef = useRef(false);
  const { writeContractAsync } = useWriteContract();

  // Shared teardown path for manual stop and component unmount.
  const stopCamera = async () => {
    if (!scannerRef.current || !scannerRunningRef.current) {
      setIsCameraActive(false);
      return;
    }

    scannerRunningRef.current = false;

    try {
      await scannerRef.current.stop();
    } catch (error) {
      console.error("Unable to stop camera:", error);
    }

    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  const startCamera = async () => {
    // html5-qrcode is loaded lazily to keep initial bundle smaller.
    const { Html5Qrcode } = await import("html5-qrcode");

    setIsCameraActive(true);
    setVerificationState("idle");
    setTicketDetails(null);

    const html5QrCode = new Html5Qrcode("qr-reader-container");
    scannerRef.current = html5QrCode;
    scannerRunningRef.current = true;

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText: string) => {
          if (!scannerRunningRef.current) return;

          scannerRunningRef.current = false;
          await html5QrCode.stop();
          setIsCameraActive(false);
          await verifyTicket(decodedText);
        },
        () => {
          return;
        },
      );
    } catch (error) {
      console.error("Unable to start camera:", error);
      setIsCameraActive(false);
      scannerRunningRef.current = false;
    }
  };

  const verifyTicket = async (rawData: string) => {
    setVerificationState("checking");

    try {
      // Verify signed payload freshness before doing on-chain ownership reads.
      const payload = parseQrPayload(rawData);
      const now = Math.floor(Date.now() / 1000);

      if (
        now < payload.timestamp - QR_FRESHNESS_GRACE_SECONDS ||
        now - payload.timestamp >
          QR_SIGNATURE_WINDOW_SECONDS + QR_FRESHNESS_GRACE_SECONDS
      ) {
        setVerificationState("expired");
        return;
      }

      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256"],
        [BigInt(payload.tokenId), BigInt(payload.timestamp)],
      );

      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        payload.signature,
      );

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://sepolia.base.org",
      );
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        DECENTRATIX_ABI,
        provider,
      );

      const ownerOfToken: string = await contract.ownerOf(payload.tokenId);
      const ticketMeta = await contract.tickets(payload.tokenId);

      const ownerMatches =
        ownerOfToken.toLowerCase() === recoveredAddress.toLowerCase();
      const notScanned = !ticketMeta.isScanned;

      if (!ownerMatches || !notScanned) {
        setVerificationState("invalid");
        return;
      }

      setTicketDetails({ tokenId: payload.tokenId, owner: recoveredAddress });
      setVerificationState("valid");

      try {
        // Optional lock write: scanner may run read-only if wallet rejects transaction.
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: DECENTRATIX_ABI,
          functionName: "scanAndLockTicket",
          args: [BigInt(payload.tokenId)],
        });
      } catch (writeError) {
        console.warn(
          "Scanner wallet not connected or rejected tx:",
          writeError,
        );
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setVerificationState("invalid");
    }
  };

  const scannerToneClass =
    verificationState === "valid"
      ? "status-success"
      : verificationState === "invalid" || verificationState === "expired"
      ? "status-danger"
      : verificationState === "checking"
      ? "status-warning"
      : "";

  const scannerTitle =
    verificationState === "valid"
      ? "Entry approved"
      : verificationState === "invalid"
      ? "Entry rejected"
      : verificationState === "expired"
      ? "QR expired"
      : verificationState === "checking"
      ? "Verification in progress"
      : isCameraActive
      ? "Scanner live"
      : "Ready for entry";

  const scannerDescription =
    verificationState === "valid"
      ? "The live QR matched the current owner and the ticket can now be locked after admission."
      : verificationState === "invalid"
      ? "This ticket failed ownership or freshness checks and should not be admitted."
      : verificationState === "expired"
      ? "This QR is outside the signed freshness window and must be refreshed before entry."
      : verificationState === "checking"
      ? "Checking timestamp freshness, recovered signer, and current on-chain ownership."
      : isCameraActive
      ? "Point the rear camera at the live ticket QR to run an entry check."
      : "Open the camera to begin live ticket verification.";

  return (
    <main className="app-shell">
      {/* Scanner topbar mirrors dashboard navigation and theme controls. */}
      <div className="topbar">
        <div className="brand-logo">
          <ThemedLogo className="h-24 w-auto md:h-28" />
        </div>
        <div className="topbar-right">
          <div className="topbar-theme">
            <ThemeToggle />
          </div>
          <div className="topbar-actions">
            <Link
              href="/"
              className="glass-button px-4 py-2 text-sm font-semibold"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="card-surface scanner-surface rounded-2xl p-6 md:p-8">
        {/* Scanner shell groups operational status, camera feed and primary actions. */}
        <div className="scanner-shell">
          <div className="scanner-head">
            <div className="scanner-summary">
              <div>
                <p className="muted text-xs font-semibold uppercase tracking-[0.16em]">
                  Gate operations
                </p>
                <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                  Gate scanner
                </h1>
                <p className="muted mt-2 text-sm leading-6">
                  Fast ticket verification for entry staff, security teams, and
                  live venue operations.
                </p>
              </div>

              <div className="scanner-strip">
                <div className="scanner-tile">
                  <p className="muted text-xs font-semibold uppercase tracking-[0.12em]">
                    Mode
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {isCameraActive ? "Live scanning" : "Standby"}
                  </p>
                </div>
                <div className="scanner-tile">
                  <p className="muted text-xs font-semibold uppercase tracking-[0.12em]">
                    Freshness rule
                  </p>
                  <p className="mt-2 text-sm font-semibold">5 minute window</p>
                </div>
                <div className="scanner-tile">
                  <p className="muted text-xs font-semibold uppercase tracking-[0.12em]">
                    Network check
                  </p>
                  <p className="mt-2 text-sm font-semibold">Ownership match</p>
                </div>
              </div>
            </div>
          </div>

          <div className="scanner-state-panel premium-state-panel">
            <p className="scanner-state-label">Entry status</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {scannerTitle}
            </h2>
            <p className="muted text-sm leading-6">{scannerDescription}</p>

            {(verificationState !== "idle" || isCameraActive) && (
              <div
                className={`scanner-status-lg mt-2 text-sm ${scannerToneClass}`}
              >
                {verificationState === "valid" && ticketDetails ? (
                  <>
                    <p className="font-semibold">
                      Ticket #{ticketDetails.tokenId}
                    </p>
                    <p className="mt-1 font-mono text-xs">
                      Owner: {ticketDetails.owner.slice(0, 8)}...
                      {ticketDetails.owner.slice(-6)}
                    </p>
                  </>
                ) : verificationState === "expired" ? (
                  <>
                    <p className="font-semibold">Refresh required</p>
                    <p className="mt-1 text-xs">
                      Ask the attendee to refresh the ticket and scan again.
                    </p>
                  </>
                ) : verificationState === "invalid" ? (
                  <>
                    <p className="font-semibold">Ticket verification failed</p>
                    <p className="mt-1 text-xs">
                      The scan did not match the latest valid ownership state.
                    </p>
                  </>
                ) : verificationState === "checking" ? (
                  <p className="font-semibold">
                    Verifying freshness and current owner...
                  </p>
                ) : (
                  <p className="font-semibold">
                    The scanner is ready for the next ticket.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="scanner-stage">
            <div className="scanner-frame">
              <div
                id="qr-reader-container"
                className="w-full overflow-hidden rounded-xl border border-[var(--line)] bg-black"
                style={{
                  display: isCameraActive ? "block" : "block",
                  minHeight: "300px",
                }}
              />

              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center text-white">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/65">
                      Scanner standby
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      Open the camera to begin live entry verification.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="glass-button glass-button-primary w-full px-5 py-3 text-sm font-semibold"
              >
                Start scanner
              </button>
            ) : (
              <button
                onClick={() => void stopCamera()}
                className="glass-button w-full px-5 py-3 text-sm font-semibold"
              >
                Stop scanner
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
