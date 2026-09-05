import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEncryptedWallet, signTransfer, unlockWallet } from "./wallet-core.js";

const directory=fileURLToPath(new URL(".",import.meta.url)); let activeWallet=null;
const nodeUrl=(value="http://127.0.0.1:8365")=>{ const url=new URL(value); if(!["http:","https:"].includes(url.protocol)) throw new Error("Node URL must use HTTP or HTTPS"); return url.origin; };
async function api(base,path,options){ const response=await fetch(`${nodeUrl(base)}${path}`,{...options,signal:AbortSignal.timeout(8000)}); const result=await response.json(); if(!response.ok) throw new Error(result.error||`Node error ${response.status}`); return result; }

function createWindow(){
  const win=new BrowserWindow({width:1040,height:720,minWidth:820,minHeight:620,backgroundColor:"#07110f",title:"KOREK Wallet",
    webPreferences:{preload:join(directory,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.removeMenu(); win.loadFile(join(directory,"renderer","index.html"));
  win.webContents.setWindowOpenHandler(({url})=>{ if(url.startsWith("https://github.com/Korek-Network/korek")) shell.openExternal(url); return {action:"deny"}; });
}

ipcMain.handle("wallet:create",async(_event,password)=>{
  const {file,privateKey}=createEncryptedWallet(password);
  const selected=await dialog.showSaveDialog({title:"Save encrypted KOREK wallet",defaultPath:`korek-wallet-${file.address.slice(-8)}.krkwallet`,filters:[{name:"KOREK Wallet",extensions:["krkwallet"]}]});
  if(selected.canceled) return {canceled:true}; await writeFile(selected.filePath,JSON.stringify(file,null,2),{mode:0o600,flag:"wx"});
  activeWallet={address:file.address,publicKey:file.publicKey,privateKey}; return {address:file.address,path:selected.filePath};
});
ipcMain.handle("wallet:open",async(_event,password)=>{
  const selected=await dialog.showOpenDialog({title:"Open KOREK wallet",properties:["openFile"],filters:[{name:"KOREK Wallet",extensions:["krkwallet","json"]}]});
  if(selected.canceled) return {canceled:true}; const file=JSON.parse(await readFile(selected.filePaths[0],"utf8")); activeWallet=unlockWallet(file,password); return {address:activeWallet.address,path:selected.filePaths[0]};
});
ipcMain.handle("wallet:lock",()=>{activeWallet=null;return true});
ipcMain.handle("node:status",(_event,base)=>api(base,"/api/status"));
ipcMain.handle("wallet:balance",(_event,base)=>{if(!activeWallet)throw new Error("Open a wallet first");return api(base,`/api/balance/${activeWallet.address}`)});
ipcMain.handle("wallet:faucet",(_event,base)=>{if(!activeWallet)throw new Error("Open a wallet first");return api(base,"/api/faucet",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({address:activeWallet.address})})});
ipcMain.handle("wallet:send",(_event,{base,to,amount})=>{if(!activeWallet)throw new Error("Open a wallet first");const tx=signTransfer(activeWallet,to,amount);return api(base,"/api/transactions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(tx)})});

app.whenReady().then(createWindow); app.on("window-all-closed",()=>{activeWallet=null;if(process.platform!=="darwin")app.quit()}); app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
