const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

// Workspace storage path
const userDataPath = app.getPath("userData");
const workspacesFile = path.join(userDataPath, "workspaces.json");

// Load saved workspaces
function loadWorkspaces() {
  try {
    if (fs.existsSync(workspacesFile)) {
      return JSON.parse(fs.readFileSync(workspacesFile, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading workspaces:", error);
  }
  return [];
}

// Save workspaces
function saveWorkspaces(workspaces) {
  try {
    fs.writeFileSync(workspacesFile, JSON.stringify(workspaces, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving workspaces:", error);
  }
}

// Create Application Menu
function createMenu() {
  const workspaces = loadWorkspaces();
  const homeDir = app.getPath('home');
  const workspaceItems = workspaces.slice(0, 10).map(ws => {
    const isDefaultName = ws.name === path.basename(ws.path);
    let label = ws.name;
    
    if (isDefaultName) {
      if (ws.path.startsWith(homeDir)) {
        label = ws.path.replace(homeDir, '~');
      } else {
        label = ws.path;
      }
    }
    
    return {
      label: label,
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('menu-open-workspace', ws.path);
        }
      }
    };
  });

  const template = [
    // App Menu (macOS)
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-go-home');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-open-folder');
            }
          }
        },
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-file');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Recent Workspaces',
          submenu: workspaceItems.length > 0 ? workspaceItems : [{ label: 'No Recent Workspaces', enabled: false }]
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    
    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-toggle-sidebar');
            }
          }
        },
        {
          label: 'Swap Sidebar Position',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-swap-sidebar');
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#1a1a2e",
    icon: path.join(__dirname, "assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.webContents.on('did-finish-load', () => {
    if (fileToOpen) {
      mainWindow.webContents.send('open-external-file', fileToOpen, isDirToOpen);
      fileToOpen = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let fileToOpen = null;
let isDirToOpen = false;

// Handle macOS open-file event
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  const isDir = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
  
  if (mainWindow && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('open-external-file', filePath, isDir);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    fileToOpen = filePath;
    isDirToOpen = isDir;
    if (app.isReady()) {
      createWindow();
    }
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Handle command line arguments from the second instance
      const args = commandLine.slice(app.isPackaged ? 1 : 2);
      if (args.length > 0) {
        const argPath = path.resolve(workingDirectory, args[0]);
        if (fs.existsSync(argPath)) {
          const stats = fs.statSync(argPath);
          mainWindow.webContents.send('open-external-file', argPath, stats.isDirectory());
        }
      }
    }
  });

  app.whenReady().then(() => {
    createMenu();
    
    // Handle command line arguments
    const args = process.argv.slice(app.isPackaged ? 1 : 2);
    if (args.length > 0) {
      const argPath = path.resolve(args[0]);
      if (fs.existsSync(argPath)) {
        fileToOpen = argPath;
        isDirToOpen = fs.statSync(argPath).isDirectory();
      }
    }

    // Only create window if none was created by open-file event
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }

    // Create default workspace if none exists
    const workspaces = loadWorkspaces();
    if (workspaces.length === 0 && !fileToOpen) {
      const defaultPath = path.join(app.getPath("documents"), "MD Viewer Notes");
      if (!fs.existsSync(defaultPath)) {
        fs.mkdirSync(defaultPath, { recursive: true });
      }
      const defaultWorkspace = { 
        name: "MD Viewer Notes", 
        path: defaultPath, 
        lastOpened: Date.now() 
      };
      saveWorkspaces([defaultWorkspace]);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC Handlers - Workspaces
ipcMain.handle("get-workspaces", async () => {
  return loadWorkspaces();
});

ipcMain.handle("save-workspace", async (event, workspace) => {
  const workspaces = loadWorkspaces();
  // Check if already exists
  const existingIndex = workspaces.findIndex(w => w.path === workspace.path);
  if (existingIndex >= 0) {
    workspaces[existingIndex] = { ...workspace, lastOpened: Date.now() };
  } else {
    workspaces.unshift({ ...workspace, lastOpened: Date.now() });
  }
  // Keep only last 10 workspaces
  const trimmed = workspaces.slice(0, 10);
  saveWorkspaces(trimmed);
  createMenu(); // Refresh menu with new workspace
  return trimmed;
});

ipcMain.handle("remove-workspace", async (event, workspacePath) => {
  const workspaces = loadWorkspaces();
  const filtered = workspaces.filter(w => w.path !== workspacePath);
  saveWorkspaces(filtered);
  createMenu(); // Refresh menu after removal
  return filtered;
});

// IPC Handlers - Folder
ipcMain.handle("open-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (result.canceled) return null;

  const folderPath = result.filePaths[0];
  const files = scanForMarkdownFiles(folderPath);

  return { path: folderPath, files };
});

ipcMain.handle("export-file", async (event, { content, format, defaultName }) => {
  const filters = [];
  if (format === 'html') filters.push({ name: 'HTML File', extensions: ['html'] });
  if (format === 'pdf') filters.push({ name: 'PDF File', extensions: ['pdf'] });
  if (format === 'docx') filters.push({ name: 'Word Document', extensions: ['docx'] });

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters
  });

  if (result.canceled) return { success: false };

  try {
    if (format === 'pdf') {
      // PDF export is handled differently via webContents
      const pdfWindow = new BrowserWindow({ show: false });
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      const data = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      fs.writeFileSync(result.filePath, data);
      pdfWindow.close();
    } else if (format === 'docx') {
      const HTMLToDOCX = require('html-to-docx');
      const fileBuffer = await HTMLToDOCX(content, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });
      fs.writeFileSync(result.filePath, fileBuffer);
    } else {
      // HTML
      fs.writeFileSync(result.filePath, content, "utf-8");
    }
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error(`Export ${format} error:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("open-workspace", async (event, folderPath) => {
  if (!fs.existsSync(folderPath)) {
    return { success: false, error: "Folder no longer exists" };
  }
  const files = scanForMarkdownFiles(folderPath);
  return { success: true, path: folderPath, files };
});

ipcMain.handle("read-file", async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-file", async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("create-file", async (event, folderPath, fileName) => {
  try {
    const filePath = path.join(
      folderPath,
      fileName.endsWith(".md") ? fileName : `${fileName}.md`,
    );

    if (fs.existsSync(filePath)) {
      return { success: false, error: "File already exists" };
    }

    const template = generateTemplate(fileName);
    fs.writeFileSync(filePath, template, "utf-8");

    return { success: true, path: filePath, content: template };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("open-external", async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to open external URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("move-file", async (event, sourcePath, targetPath) => {
  try {
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: "Source file not found" };
    }

    // Determine destination path
    // If targetPath is a directory, append source filename
    let destinationPath = targetPath;
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      destinationPath = path.join(targetPath, path.basename(sourcePath));
    }

    // Check if destination already exists to avoid overwrite (optional, or fail)
    if (fs.existsSync(destinationPath)) {
      return { success: false, error: "Destination file already exists" };
    }

    fs.renameSync(sourcePath, destinationPath);
    return { success: true, path: destinationPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function scanForMarkdownFiles(folderPath) {
  function scan(dir) {
    const results = [];
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        if (item.startsWith(".") || item === 'node_modules') continue;

        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const children = scan(fullPath);
          // Only add folder if it has markdown children (directly or indirectly)
          if (children.length > 0) {
            results.push({
              name: item,
              path: fullPath,
              type: 'directory',
              children: children
            });
          }
        } else if (item.endsWith(".md") || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(item)) {
          results.push({
            name: item,
            path: fullPath,
            type: 'file',
            relativePath: path.relative(folderPath, fullPath)
          });
        }
      }
    } catch (error) {
      console.error("Error scanning directory:", error);
    }
    
    // Sort: directories first, then files with priority (index.md, README.md, README*.md), then alphabetical
    return results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      
      if (a.type === 'file') {
        const getPriority = (name) => {
          const lowerName = name.toLowerCase();
          if (lowerName === 'index.md') return 0;
          if (lowerName === 'readme.md') return 1;
          if (lowerName.startsWith('readme')) return 2;
          return 3;
        };

        const pA = getPriority(a.name);
        const pB = getPriority(b.name);

        if (pA !== pB) return pA - pB;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });
  }

  return scan(folderPath);
}

function generateTemplate(fileName) {
  const title = fileName.replace(".md", "").replace(/[-_]/g, " ");
  const date = new Date().toISOString().split("T")[0];

  return `# ${title.charAt(0).toUpperCase() + title.slice(1)}

> Created on ${date}

## Overview

Start writing your content here...

## Notes

- 

## References

- 
`;
}
