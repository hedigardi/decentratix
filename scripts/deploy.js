const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Decentratix deployment...");

  // Operational roles are injected via env for safer deployment automation.
  const organizerAddress = process.env.ORGANIZER_ADDRESS;
  const scannerAddress = process.env.SCANNER_ADDRESS;

  if (!organizerAddress || !scannerAddress) {
    throw new Error(
      "Missing ORGANIZER_ADDRESS or SCANNER_ADDRESS in environment variables.",
    );
  }

  const Decentratix = await ethers.getContractFactory("Decentratix");
  // Constructor bps values: max markup 10% and royalty 5%.
  const contract = await Decentratix.deploy(
    "Decentratix Event",
    "TIX",
    organizerAddress,
    scannerAddress,
    1000,
    500,
  );

  await contract.waitForDeployment();
  const deployedAddress = await contract.getAddress();

  console.log(`Decentratix deployed to: ${deployedAddress}`);
  console.log(
    "Constructor values: maxMarkup=10% (1000 bps), royalty=5% (500 bps)",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
