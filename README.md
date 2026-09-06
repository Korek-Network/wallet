# KOREK Wallet — Planck Testnet

Official cross-platform desktop wallet for the KOREK Planck testnet. Version 0.2.1 manages a transparent account and a separate wormhole mining-reward account from one encrypted wallet file and one 24-word recovery phrase.

## Features

- Mandatory first-run backup screen showing the complete 24-word recovery phrase
- KOREK 24-word recovery phrase with deterministic account recovery
- Separate `transparent/0` and `wormhole/0` testnet derivation paths
- Spend mining rewards directly from the wormhole balance
- Copy the 32-byte rewards inner hash for your own miner/node
- Password encryption using scrypt and AES-256-GCM
- Signed version 3 wormhole transfers with domain separation
- Compatible opening of legacy v0.1 `.krkwallet` files
- Windows, Linux, and unsigned macOS packages

Download the latest installers from [KOREK Wallet Planck Testnet releases](https://github.com/Korek-Network/wallet/releases/tag/wallet-testnet-latest).

## Run from source

```bash
git clone https://github.com/Korek-Network/wallet.git
cd wallet
npm ci
npm test
npm start
```

Node.js 22 or newer is required.

## Mining rewards

Create a v0.2 wallet and back up the displayed 24 words offline. In **Mining rewards**, copy the inner hash and provide it to your own Planck miner:

```bash
npm run mine -- --rewards-inner-hash YOUR_64_CHARACTER_INNER_HASH
```

Full instructions are in the blockchain repository's [mining and node guide](https://github.com/Korek-Network/blockchain/blob/main/docs/MINING_AND_NODE.md).

## Recovery and security

KOREK phrases are currently a project-specific Planck testnet format, not BIP39. The phrase and private keys are encrypted inside the wallet file. Anyone who gets the phrase can recover and spend both accounts, so never share it. The inner hash does not contain a signing key, but it links mining activity to the wormhole address.

This wallet uses Ed25519 only as an unaudited testnet bootstrap. It is not quantum-resistant yet and must not hold real funds. macOS artifacts are currently unsigned and not notarized.
