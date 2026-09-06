import { createCipheriv, createDecipheriv, createHash, generateKeyPairSync, randomBytes, scryptSync, sign } from "node:crypto";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function createEncryptedWallet(password) {
  if (typeof password !== "string" || password.length < 10) throw new Error("Password must contain at least 10 characters");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" });
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
  const address = `krk1${sha256(publicPem).slice(0, 40)}`;
  const salt = randomBytes(16); const iv = randomBytes(12); const key = scryptSync(password, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privatePem), cipher.final()]);
  return {
    file: { format: "korek-wallet", version: 1, network: "korek-testnet-1", address, publicKey: publicPem,
      encryption: { kdf: "scrypt", cipher: "aes-256-gcm", salt: salt.toString("base64"), iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") } },
    privateKey: privatePem,
  };
}

export function unlockWallet(file, password) {
  if (file?.format !== "korek-wallet" || file?.version !== 1 || !file.encryption) throw new Error("Unsupported or damaged wallet file");
  try {
    const e=file.encryption; const key=scryptSync(password,Buffer.from(e.salt,"base64"),32);
    const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(e.iv,"base64"));
    decipher.setAuthTag(Buffer.from(e.tag,"base64"));
    const privateKey=Buffer.concat([decipher.update(Buffer.from(e.data,"base64")),decipher.final()]).toString();
    if (`krk1${sha256(file.publicKey).slice(0,40)}` !== file.address) throw new Error("Address does not match public key");
    return { address:file.address, publicKey:file.publicKey, privateKey };
  } catch { throw new Error("Incorrect password or damaged wallet file"); }
}

export function parseKrk(value) {
  if (!/^\d+(\.\d{1,8})?$/.test(value)) throw new Error("Enter a positive KRK amount with no more than 8 decimals");
  const [whole,fraction=""] = value.split("."); const units=BigInt(whole)*100_000_000n+BigInt(fraction.padEnd(8,"0"));
  if (units<=0n) throw new Error("Amount must be greater than zero"); return units.toString();
}

export function signTransfer(wallet, to, krkAmount) {
  if (!/^krk1[0-9a-f]{40}$/.test(to)) throw new Error("Invalid KOREK address");
  const amount=parseKrk(krkAmount); const timestamp=Date.now(); const version=2; const gasPrice="1"; const gasLimit="21000";
  const message=`${wallet.address}|${to}|${amount}|${timestamp}|${gasPrice}|${gasLimit}`;
  return { version,from:wallet.address,to,amount,timestamp,gasPrice,gasLimit,publicKey:wallet.publicKey,
    signature:sign(null,Buffer.from(message),wallet.privateKey).toString("base64") };
}
