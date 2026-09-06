const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("korek",{
 create:(password)=>ipcRenderer.invoke("wallet:create",password),restore:(input)=>ipcRenderer.invoke("wallet:restore",input),open:(password)=>ipcRenderer.invoke("wallet:open",password),recovery:()=>ipcRenderer.invoke("wallet:recovery"),lock:()=>ipcRenderer.invoke("wallet:lock"),
 status:(base)=>ipcRenderer.invoke("node:status",base),balance:(base,scheme)=>ipcRenderer.invoke("wallet:balance",{base,scheme}),faucet:(base)=>ipcRenderer.invoke("wallet:faucet",base),send:(input)=>ipcRenderer.invoke("wallet:send",input)
});
