const { ipcRenderer } = require('electron');

// Expose API directly to window (contextIsolation is disabled)
window.api = {
  // Workspace management
  getWorkspaces: () => ipcRenderer.invoke('get-workspaces'),
  saveWorkspace: (workspace) => ipcRenderer.invoke('save-workspace', workspace),
  removeWorkspace: (path) => ipcRenderer.invoke('remove-workspace', path),
  openWorkspace: (path) => ipcRenderer.invoke('open-workspace', path),
  
  // File operations
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  createFile: (folderPath, fileName) => ipcRenderer.invoke('create-file', folderPath, fileName),
  exportFile: (data) => ipcRenderer.invoke('export-file', data)
};
