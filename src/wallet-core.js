import { createCipheriv, createDecipheriv, createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, scryptSync, sign } from "node:crypto";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const PREFIXES=["amber","brisk","cedar","dawn","ember","frost","green","harbor","ivory","jolly","kind","lunar","maple","north","ocean","prairie"];
const SUFFIXES=["arch","bird","cloud","drum","elm","field","glow","hill","isle","jade","kite","leaf","moon","nest","oak","pine"];
const WORDS=Array.from({length:256},(_,i)=>`${PREFIXES[i>>4]}${SUFFIXES[i&15]}`);
const WORD_INDEX=new Map(WORDS.map((word,index)=>[word,index]));
const ED25519_PREFIX=Buffer.from("302e020100300506032b657004220420","hex");

const normalizeMnemonic=(value)=>String(value||"").trim().toLowerCase().split(/\s+/).join(" ");
export function generateMnemonic(){return [...randomBytes(24)].map(byte=>WORDS[byte]).join(" ")}
export function validateMnemonic(value){const words=normalizeMnemonic(value).split(" ");return words.length===24&&words.every(word=>WORD_INDEX.has(word))}
const seedFromMnemonic=(mnemonic,path)=>scryptSync(normalizeMnemonic(mnemonic),`KOREK_PLANCK_${path}`,32);
const keyPairFromSeed=(seed)=>{const privateKey=createPrivateKey({key:Buffer.concat([ED25519_PREFIX,seed]),format:"der",type:"pkcs8"});const publicKey=createPublicKey(privateKey);return{privateKey:privateKey.export({type:"pkcs8",format:"pem"}),publicKey:publicKey.export({type:"spki",format:"pem"})}}
const transparentAddress=(publicKey)=>`krk1${sha256(publicKey).slice(0,40)}`;
const wormholeInnerHash=(publicKey)=>sha256(`korek-wormhole-v1:${publicKey}`);
const wormholeAddress=(innerHash)=>`krk1${innerHash.slice(0,40)}`;

export function deriveAccounts(mnemonic){
  if(!validateMnemonic(mnemonic))throw new Error("Recovery phrase must contain 24 valid KOREK words");
  const transparent=keyPairFromSeed(seedFromMnemonic(mnemonic,"transparent/0"));
  const wormhole=keyPairFromSeed(seedFromMnemonic(mnemonic,"wormhole/0"));
  const innerHash=wormholeInnerHash(wormhole.publicKey);
  return{
    transparent:{...transparent,address:transparentAddress(transparent.publicKey),addressScheme:"transparent-v1"},
    wormhole:{...wormhole,address:wormholeAddress(innerHash),innerHash,addressScheme:"wormhole-v1"},
  };
}

const encrypt=(payload,password)=>{const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(password,salt,32);const cipher=createCipheriv("aes-256-gcm",key,iv);const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload)),cipher.final()]);return{kdf:"scrypt",cipher:"aes-256-gcm",salt:salt.toString("base64"),iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),data:encrypted.toString("base64")}}
const decrypt=(encryption,password)=>{const key=scryptSync(password,Buffer.from(encryption.salt,"base64"),32);const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(encryption.iv,"base64"));decipher.setAuthTag(Buffer.from(encryption.tag,"base64"));return Buffer.concat([decipher.update(Buffer.from(encryption.data,"base64")),decipher.final()]).toString()}

export function createEncryptedWallet(password,mnemonic=generateMnemonic()){
  if(typeof password!=="string"||password.length<10)throw new Error("Password must contain at least 10 characters");
  const accounts=deriveAccounts(mnemonic);
  const payload={mnemonic:normalizeMnemonic(mnemonic),transparentPrivateKey:accounts.transparent.privateKey,wormholePrivateKey:accounts.wormhole.privateKey};
  const file={format:"korek-wallet",version:2,network:"korek-planck-testnet-1",address:accounts.transparent.address,publicKey:accounts.transparent.publicKey,
    accounts:{transparent:{address:accounts.transparent.address,publicKey:accounts.transparent.publicKey},wormhole:{address:accounts.wormhole.address,publicKey:accounts.wormhole.publicKey,innerHash:accounts.wormhole.innerHash}},encryption:encrypt(payload,password)};
  return{file,wallet:{mnemonic:payload.mnemonic,...accounts},privateKey:accounts.transparent.privateKey,recoveryPhrase:payload.mnemonic};
}

export function unlockWallet(file,password){
  if(file?.format!=="korek-wallet"||![1,2].includes(file?.version)||!file.encryption)throw new Error("Unsupported or damaged wallet file");
  try{
    const plain=decrypt(file.encryption,password);
    if(file.version===1){if(transparentAddress(file.publicKey)!==file.address)throw new Error("Address mismatch");return{address:file.address,publicKey:file.publicKey,privateKey:plain,addressScheme:"transparent-v1",legacy:true}}
    const payload=JSON.parse(plain),accounts=deriveAccounts(payload.mnemonic);
    if(accounts.transparent.address!==file.accounts?.transparent?.address||accounts.wormhole.address!==file.accounts?.wormhole?.address)throw new Error("Account mismatch");
    return{mnemonic:payload.mnemonic,transparent:accounts.transparent,wormhole:accounts.wormhole,address:accounts.transparent.address,publicKey:accounts.transparent.publicKey,privateKey:accounts.transparent.privateKey};
  }catch{throw new Error("Incorrect password or damaged wallet file")}
}

export function parseKrk(value){if(!/^\d+(\.\d{1,8})?$/.test(value))throw new Error("Enter a positive KRK amount with no more than 8 decimals");const[whole,fraction=""]=value.split(".");const units=BigInt(whole)*100_000_000n+BigInt(fraction.padEnd(8,"0"));if(units<=0n)throw new Error("Amount must be greater than zero");return units.toString()}
export function accountFor(wallet,scheme="transparent-v1"){if(wallet.legacy)return wallet;if(scheme==="wormhole-v1")return wallet.wormhole;return wallet.transparent}
export function signTransfer(wallet,to,krkAmount,scheme="transparent-v1"){
  if(!/^krk1[0-9a-f]{40}$/.test(to))throw new Error("Invalid KOREK address");const account=accountFor(wallet,scheme);const amount=parseKrk(krkAmount),timestamp=Date.now(),version=3,gasPrice="1",gasLimit="21000";
  const message=`${account.address}|${to}|${amount}|${timestamp}|${gasPrice}|${gasLimit}|${account.addressScheme}`;
  return{version,from:account.address,to,amount,timestamp,gasPrice,gasLimit,addressScheme:account.addressScheme,publicKey:account.publicKey,signature:sign(null,Buffer.from(message),account.privateKey).toString("base64")};
}
