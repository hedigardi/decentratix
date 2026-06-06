require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  solidity: "0.8.20",
  networks: {
    // Base Sepolia is the primary test network used by the demo dApp.
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 84532,
    },
  },
  etherscan: {
    // Enables `hardhat verify` against BaseScan testnet explorer endpoints.
    apiKey: {
      baseSepolia: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

module.exports = config;
