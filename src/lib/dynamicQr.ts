import { ethers } from "ethers";

export interface QRCodePayload {
  tokenId: number;
  timestamp: number;
  signature: string;
}

export async function generateDynamicQR(
  tokenId: number,
  signer: ethers.Signer,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
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
