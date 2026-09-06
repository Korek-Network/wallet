import test from "node:test";
import assert from "node:assert/strict";
import { createEncryptedWallet, parseKrk, signTransfer, unlockWallet } from "../src/wallet-core.js";

test("creates and unlocks an encrypted KOREK wallet",()=>{const made=createEncryptedWallet("correct horse battery");assert.match(made.file.address,/^krk1[0-9a-f]{40}$/);assert.ok(!JSON.stringify(made.file).includes("PRIVATE KEY"));assert.equal(unlockWallet(made.file,"correct horse battery").address,made.file.address);assert.throws(()=>unlockWallet(made.file,"wrong password"))});
test("converts KRK without floating-point arithmetic",()=>{assert.equal(parseKrk("1"),"100000000");assert.equal(parseKrk("0.00000001"),"1");assert.throws(()=>parseKrk("1.000000001"))});
test("creates a signed transfer with gas",()=>{const made=createEncryptedWallet("long test password");const wallet=unlockWallet(made.file,"long test password");const tx=signTransfer(wallet,made.file.address,"2.5");assert.equal(tx.amount,"250000000");assert.equal(tx.version,2);assert.equal(tx.gasPrice,"1");assert.equal(tx.gasLimit,"21000");assert.ok(tx.signature)});
