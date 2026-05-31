"use client";

import { ethers } from "ethers";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWriteContract } from "wagmi";

import { CONTRACT_ADDRESS, DECENTRATIX_ABI } from "@/lib/abi";
import { parseQrPayload } from "@/lib/dynamicQr";

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
      const payload = parseQrPayload(rawData);
      const now = Math.floor(Date.now() / 1000);

      if (now - payload.timestamp > 30) {
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

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10">
      <div className="rounded-3xl border border-black/15 bg-white/90 p-6 shadow-xl shadow-black/10 backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Gate Scanner
            </h1>
            <p className="text-sm text-black/60">
              Decentratix verification mode
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white"
          >
            Back
          </Link>
        </div>

        <div
          id="qr-reader-container"
          className="w-full overflow-hidden rounded-2xl border border-black/20 bg-black"
          style={{
            display: isCameraActive ? "block" : "none",
            minHeight: "300px",
          }}
        />

        <div className="mt-5 space-y-4">
          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white hover:opacity-90"
            >
              Open Camera
            </button>
          ) : (
            <button
              onClick={() => void stopCamera()}
              className="w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-red-500"
            >
              Cancel Scan
            </button>
          )}

          {verificationState === "checking" && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-100 p-4 text-center text-sm font-semibold text-amber-900">
              Checking timestamp, signature, and on-chain ownership...
            </div>
          )}

          {verificationState === "expired" && (
            <div className="rounded-2xl border border-red-400/50 bg-red-100 p-4 text-sm text-red-900">
              <p className="font-extrabold uppercase tracking-wide">
                Expired QR code
              </p>
              <p className="mt-1 text-xs">
                The code is older than 30 seconds and was rejected.
              </p>
            </div>
          )}

          {verificationState === "invalid" && (
            <div className="rounded-2xl border border-red-400/50 bg-red-100 p-4 text-sm text-red-900">
              <p className="font-extrabold uppercase tracking-wide">
                Invalid ticket
              </p>
              <p className="mt-1 text-xs">
                Signature mismatch, stale owner, or already scanned ticket.
              </p>
            </div>
          )}

          {verificationState === "valid" && ticketDetails && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-100 p-4 text-sm text-emerald-900">
              <p className="font-extrabold uppercase tracking-wide">
                Access granted
              </p>
              <p className="mt-2 font-mono text-xs">
                Ticket #{ticketDetails.tokenId}
              </p>
              <p className="font-mono text-xs">
                Holder: {ticketDetails.owner.slice(0, 8)}...
                {ticketDetails.owner.slice(-6)}
              </p>
              <p className="mt-2 text-xs">
                scanAndLockTicket submitted if scanner wallet was connected.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
