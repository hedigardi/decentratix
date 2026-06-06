import { ethers } from "ethers";

// Tickets share one signature per window to reduce repetitive wallet prompts.
export const QR_SIGNATURE_WINDOW_SECONDS = 300;
export const QR_FRESHNESS_GRACE_SECONDS = 30;

export interface QRCodePayload {
  tokenId: number;
  timestamp: number;
  signature: string;
}

export function getSignatureWindowTimestamp(currentTimestamp: number): number {
  // Bucket timestamps into deterministic windows used by scanner freshness checks.
  return (
    Math.floor(currentTimestamp / QR_SIGNATURE_WINDOW_SECONDS) *
    QR_SIGNATURE_WINDOW_SECONDS
  );
}

export async function generateDynamicQR(
  tokenId: number,
  signer: ethers.Signer,
  signingTimestamp?: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const timestamp = signingTimestamp ?? getSignatureWindowTimestamp(now);
  // The message signs token ownership at a specific time window.
  const messageHash = ethers.solidityPackedKeccak256(
    ["uint256", "uint256"],
    [BigInt(tokenId), BigInt(timestamp)],
  );

  const signature = await signer.signMessage(ethers.getBytes(messageHash));
  const payload: QRCodePayload = { tokenId, timestamp, signature };

  return JSON.stringify(payload);
}

export function parseQrPayload(rawData: string): QRCodePayload {
  const parsed = JSON.parse(rawData) as QRCodePayload;

  // Runtime guard prevents malformed payloads from entering verification flow.
  if (
    typeof parsed.tokenId !== "number" ||
    typeof parsed.timestamp !== "number" ||
    typeof parsed.signature !== "string"
  ) {
    throw new Error("Invalid payload");
  }

  return parsed;
}
