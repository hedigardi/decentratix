import { ethers } from "ethers";

export const QR_SIGNATURE_WINDOW_SECONDS = 300;
export const QR_FRESHNESS_GRACE_SECONDS = 30;

export interface QRCodePayload {
  tokenId: number;
  timestamp: number;
  signature: string;
}

export function getSignatureWindowTimestamp(currentTimestamp: number): number {
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

  if (
    typeof parsed.tokenId !== "number" ||
    typeof parsed.timestamp !== "number" ||
    typeof parsed.signature !== "string"
  ) {
    throw new Error("Invalid payload");
  }

  return parsed;
}
