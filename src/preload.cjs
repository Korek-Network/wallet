const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("korek",{
  create:(password)=>ipcRenderer.invoke("wallet:create",password), open:(password)=>ipcRenderer.invoke("wallet:open",password),
  lock:()=>ipcRenderer.invoke("wallet:lock"), status:(base)=>ipcRenderer.invoke("node:status",base),
  balance:(base)=>ipcRenderer.invoke("wallet:balance",base), faucet:(base)=>ipcRenderer.invoke("wallet:faucet",base),
  send:(input)=>ipcRenderer.invoke("wallet:send",input)
});
