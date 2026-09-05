# KOREK Desktop Wallet

Cross-platform testnet wallet for Windows and Linux. It creates Ed25519 testnet keys locally, encrypts private keys with scrypt and AES-256-GCM, connects to a configurable [KOREK blockchain node](https://github.com/Korek-Network/blockchain), displays balances, requests 100 test KRK from the faucet and signs transfers.

## Development

```bash
npm install
npm test
npm start
```

## Build installers

```bash
npm run dist:linux
npm run dist:windows
```

GitHub Actions builds Windows `.exe`, Linux `.AppImage` and Linux `.deb` artifacts. Tagged versions beginning with `wallet-v` publish the files to GitHub Releases.

## Warning

Version 0.1 is unaudited testnet software. The node currently uses Ed25519 and the chain resets on restart. Do not use the wallet for real money.
