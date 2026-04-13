#!/usr/bin/env node

/**
 * Deploy CensorshipOracle to opBNB testnet.
 *
 * Usage:
 *   PRIVATE_KEY=0x... node scripts/deploy.mjs
 *
 * Pre-requisites:
 *   1. Get tBNB from https://testnet.bnbchain.org/faucet-smart
 *   2. Bridge to opBNB testnet: https://opbnb-testnet-bridge.bnbchain.org
 */

import { ethers } from 'ethers';

const OPBNB_TESTNET_RPC = 'https://opbnb-testnet-rpc.bnbchain.org';
const CHAIN_ID = 5611;

// Compiled contract bytecode and ABI
// To get these: compile CensorshipOracle.sol with solc or Remix
// For hackathon speed: use Remix IDE (remix.ethereum.org) to compile and paste here

const CONTRACT_ABI = [
  "constructor()",
  "function owner() view returns (address)",
  "function updateCountryRisk(string country, uint8 score, string riskLevel, uint16 incidentCount)",
  "function attestIncident(string incidentId, string country, string title, string severity, string incidentType, uint8 confidence, uint32 measurements, uint64 timestamp, string sources)",
  "function isSafe(string country) view returns (uint8 score, bool safe, string level, uint64 lastUpdate)",
  "function countryRisks(string) view returns (uint8 score, uint64 updatedAt, uint16 incidentCount, string riskLevel)",
  "function incidents(string) view returns (string incidentId, string country, string title, string severity, string incidentType, uint8 confidence, uint32 measurements, uint64 timestamp, string sources, address attestedBy)",
  "function totalAttestations() view returns (uint256)",
  "function getScoredCountryCount() view returns (uint256)",
  "function transferOwnership(address newOwner)",
  "event CountryRiskUpdated(string indexed country, uint8 score, string riskLevel, uint16 incidentCount, uint64 timestamp)",
  "event IncidentAttested(string indexed incidentId, string country, string severity, uint8 confidence, uint32 measurements, uint64 timestamp, address attestedBy)",
];

// Paste compiled bytecode here after compiling in Remix
const BYTECODE = process.env.BYTECODE || '';

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set PRIVATE_KEY environment variable');
    process.exit(1);
  }

  if (!BYTECODE) {
    console.log(`
To deploy:
1. Go to https://remix.ethereum.org
2. Paste contracts/CensorshipOracle.sol
3. Compile with Solidity 0.8.19+
4. Copy the bytecode from compilation artifacts
5. Run: PRIVATE_KEY=0x... BYTECODE=0x... node scripts/deploy.mjs

Or deploy directly from Remix:
1. Select "Injected Provider" in Remix
2. Switch MetaMask to opBNB Testnet (RPC: ${OPBNB_TESTNET_RPC}, Chain ID: ${CHAIN_ID})
3. Click Deploy
4. Copy the deployed contract address
5. Save it in .env as ORACLE_ADDRESS=0x...
`);
    process.exit(0);
  }

  const provider = new ethers.providers.JsonRpcProvider(OPBNB_TESTNET_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deploying CensorshipOracle...');
  console.log('Network: opBNB Testnet (chain ID:', CHAIN_ID, ')');
  console.log('Deployer:', wallet.address);

  const balance = await wallet.getBalance();
  console.log('Balance:', ethers.utils.formatEther(balance), 'tBNB');

  if (balance.isZero()) {
    console.error('No tBNB balance. Get testnet tokens from the faucet.');
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(CONTRACT_ABI, BYTECODE, wallet);
  const contract = await factory.deploy();
  console.log('Tx hash:', contract.deployTransaction.hash);

  await contract.deployed();
  console.log('');
  console.log('✅ CensorshipOracle deployed!');
  console.log('Contract address:', contract.address);
  console.log('Explorer:', `https://testnet.opbnbscan.com/address/${contract.address}`);
  console.log('');
  console.log('Save this in your .env:');
  console.log(`ORACLE_ADDRESS=${contract.address}`);
}

main().catch(console.error);
