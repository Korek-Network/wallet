import { app,BrowserWindow,dialog,ipcMain,shell } from "electron";
import { readFile,writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { accountFor,createEncryptedWallet,signTransfer,unlockWallet } from "./wallet-core.js";

const directory=fileURLToPath(new URL(".",import.meta.url));let activeWallet=null;
const nodeUrl=(value="https://rpc.planck.korek.network")=>{const url=new URL(value);if(!["http:","https:"].includes(url.protocol))throw new Error("Node URL must use HTTP or HTTPS");return url.origin};
async function api(base,path,options){const response=await fetch(`${nodeUrl(base)}${path}`,{...options,signal:AbortSignal.timeout(8000)}),result=await response.json();if(!response.ok)throw new Error(result.error||`Node error ${response.status}`);return result}
function summary(wallet,recoveryPhrase){const transparent=accountFor(wallet,"transparent-v1"),wormhole=wallet.legacy?null:wallet.wormhole;return{address:transparent.address,wormholeAddress:wormhole?.address||null,innerHash:wormhole?.innerHash||null,legacy:Boolean(wallet.legacy),recoveryPhrase}}
async function saveNew(password,mnemonic){const made=createEncryptedWallet(password,mnemonic),selected=await dialog.showSaveDialog({title:"Save encrypted KOREK wallet",defaultPath:`korek-wallet-${made.file.address.slice(-8)}.krkwallet`,filters:[{name:"KOREK Wallet",extensions:["krkwallet"]}]});if(selected.canceled)return{canceled:true};await writeFile(selected.filePath,JSON.stringify(made.file,null,2),{mode:0o600,flag:"wx"});activeWallet=made.wallet;return{...summary(activeWallet,made.recoveryPhrase),path:selected.filePath}}
function createWindow(){const win=new BrowserWindow({width:1120,height:760,minWidth:860,minHeight:650,backgroundColor:"#07110f",title:"KOREK Wallet",webPreferences:{preload:join(directory,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});win.removeMenu();win.loadFile(join(directory,"renderer","index.html"));win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith("https://github.com/Korek-Network/"))shell.openExternal(url);return{action:"deny"}})}

ipcMain.handle("wallet:create",(_event,password)=>saveNew(password));
ipcMain.handle("wallet:restore",(_event,{password,mnemonic})=>saveNew(password,mnemonic));
ipcMain.handle("wallet:open",async(_event,password)=>{const selected=await dialog.showOpenDialog({title:"Open KOREK wallet",properties:["openFile"],filters:[{name:"KOREK Wallet",extensions:["krkwallet","json"]}]});if(selected.canceled)return{canceled:true};const file=JSON.parse(await readFile(selected.filePaths[0],"utf8"));activeWallet=unlockWallet(file,password);return{...summary(activeWallet),path:selected.filePaths[0]}});
ipcMain.handle("wallet:recovery",()=>{if(!activeWallet||activeWallet.legacy)throw new Error("This legacy wallet has no recovery phrase");return activeWallet.mnemonic});
ipcMain.handle("wallet:lock",()=>{activeWallet=null;return true});
ipcMain.handle("node:status",(_event,base)=>api(base,"/api/status"));
ipcMain.handle("wallet:balance",(_event,{base,scheme})=>{if(!activeWallet)throw new Error("Open a wallet first");const account=accountFor(activeWallet,scheme);return api(base,`/api/balance/${account.address}`)});
ipcMain.handle("wallet:faucet",(_event,base)=>{if(!activeWallet)throw new Error("Open a wallet first");return api(base,"/api/faucet",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({address:accountFor(activeWallet).address})})});
ipcMain.handle("wallet:send",(_event,{base,to,amount,scheme})=>{if(!activeWallet)throw new Error("Open a wallet first");return api(base,"/api/transactions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(signTransfer(activeWallet,to,amount,scheme))})});

app.whenReady().then(createWindow);app.on("window-all-closed",()=>{activeWallet=null;if(process.platform!=="darwin")app.quit()});app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
