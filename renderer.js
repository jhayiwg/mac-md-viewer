// ========================================
// Library Configuration
// Libraries are loaded via script tags in index.html
// marked, hljs (highlight.js), mermaid are global objects
// ========================================

const { ipcRenderer } = require('electron');
const path = require('path');

// Global Error Handler to debug renderer issues
window.addEventListener('error', (event) => {
  alert('Script Error: ' + event.message + '\nLine: ' + event.lineno);
});

// Configure Marked.js with Highlight.js
marked.setOptions({
  gfm: true,           // GitHub Flavored Markdown (includes tables)
  breaks: true,        // Convert \n to <br>
  headerIds: true,     // Add IDs to headers
  mangle: false,       // Don't mangle email links
  highlight: function(code, lang) {
    // Use highlight.js for syntax highlighting
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.error('Highlight error:', err);
      }
    }
    // Fallback: auto-detect language
    return hljs.highlightAuto(code).value;
  }
});

// Custom renderer to handle mermaid diagrams
// Custom renderer
const renderer = new marked.Renderer();
const originalCodeRenderer = renderer.code.bind(renderer);

renderer.code = function(code, language, isEscaped) {
  if (language === 'mermaid') {
    return `<div class="mermaid">${code}</div>`;
  }
  if (language === 'sequence') {
    return `<div class="mermaid sequence">${code}</div>`;
  }
  if (language === 'flow') {
    return `<div class="flow-chart">${code}</div>`;
  }
  if (language === 'math' || language === 'latex' || language === 'katex') {
    try {
      return katex.renderToString(code, { displayMode: true });
    } catch (err) {
      return `<div class="katex-error">${err.css ? err.css : 'Math Error'}</div>`;
    }
  }
  return originalCodeRenderer(code, language, isEscaped);
};

marked.setOptions({ renderer });

// ========================================
// Configure Mermaid.js
// ========================================
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#7c3aed',
    primaryTextColor: '#e8e8e8',
    primaryBorderColor: '#a855f7',
    lineColor: '#a0a0b0',
    secondaryColor: '#1a1a2e',
    tertiaryColor: '#16213e',
    background: '#0f0f1a',
    mainBkg: '#1a1a2e',
    nodeBorder: '#7c3aed',
    clusterBkg: '#16213e',
    clusterBorder: '#7c3aed',
    titleColor: '#e8e8e8',
    edgeLabelBackground: '#1a1a2e'
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
});

// Function to render mermaid diagrams after markdown is rendered
// Function to render mermaid diagrams after markdown is rendered
async function renderMermaidDiagrams() {
  const mermaidElements = document.querySelectorAll('.mermaid');
  for (const element of mermaidElements) {
    // Check if valid code content exists
    if (!element.textContent.trim()) continue;
    
    // Alias sequence syntax adjustment if needed
    // Alias sequence syntax adjustment if needed
    let content = element.textContent;
    
    // EXPLICIT: If tagged as sequence, force sequenceDiagram if missing
    if (element.classList.contains('sequence')) {
         if (!content.trim().startsWith('sequenceDiagram')) {
             content = 'sequenceDiagram\n' + content;
         }
    } 
    // HEURISTIC: Legacy support or plain blocks
    else if (content.trim().startsWith('participant') || content.trim().startsWith('Title:')) {
       // Possible js-sequence-diagrams syntax, Mermaid might handle it or need "sequenceDiagram" prepended
       if (!content.includes('sequenceDiagram')) {
         content = 'sequenceDiagram\n' + content;
       }
    }

    try {
      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
      const { svg } = await mermaid.render(id, content);
      element.innerHTML = svg;
    } catch (err) {
      console.error('Mermaid render error:', err);
      // Don't show large error blocks for work-in-progress typing
      element.innerHTML = `<pre class="mermaid-error" style="color:red; font-size:0.8em;">${err.message}</pre>`;
    }
  }
}

// Render Flowcharts
function renderFlowcharts() {
  const flowElements = document.querySelectorAll('.flow-chart');
  for (const element of flowElements) {
    try {
      const code = element.textContent;
      element.innerHTML = ''; // Clear text
      const chart = flowchart.parse(code);
      chart.drawSVG(element, {
        'x': 0,
        'y': 0,
        'line-width': 2,
        'line-length': 50,
        'text-margin': 10,
        'font-size': 14,
        'font-color': '#e8e8e8',
        'line-color': '#a0a0b0',
        'element-color': '#a0a0b0',
        'fill': '#1a1a2e',
        'yes-text': 'yes',
        'no-text': 'no',
        'arrow-end': 'block',
        'scale': 1,
        'flowstate' : {
          'past' : { 'fill' : '#CCCCCC', 'font-size' : 12},
          'current' : {'fill' : 'yellow', 'font-color' : 'red', 'font-weight' : 'bold'},
          'future' : { 'fill' : '#FFFF99'},
          'request' : { 'fill' : 'blue'},
          'invalid': {'fill' : '#444444'},
          'approved' : { 'fill' : '#58C4A3', 'font-size' : 12, 'yes-text' : 'APPROVED', 'no-text' : 'n/a' },
          'rejected' : { 'fill' : '#C45879', 'font-size' : 12, 'yes-text' : 'n/a', 'no-text' : 'REJECTED' }
        }
      });
    } catch (err) {
      console.error('Flowchart render error:', err);
      element.innerHTML = `<pre>Flowchart Error: ${err.message}</pre>`;
    }
  }
}

// Generate Table of Contents
function generateTOC(htmlContent) {
  // If [TOC] is present, generate it
  if (!htmlContent.includes('[TOC]') && !htmlContent.includes('[toc]')) {
    return htmlContent;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const headers = doc.querySelectorAll('h1, h2, h3');
  
  if (headers.length === 0) {
    return htmlContent.replace(/\[TOC\]/gi, '');
  }

  let tocHtml = '<div class="toc"><h3>Table of Contents</h3><ul>';
  
  headers.forEach((header, index) => {
    // Ensure header has ID
    // Note: marked normally adds IDs if headerIds: true is set, but let's ensure it.
    if (!header.id) {
          header.id = 'header-' + index;
    }
    
    const level = parseInt(header.tagName.substring(1));
    const text = header.textContent;
    const marginLeft = (level - 1) * 20;
    
    tocHtml += `<li style="margin-left: ${marginLeft}px"><a href="#${header.id}">${text}</a></li>`;
  });
  
  tocHtml += '</ul></div>';
  
  // We modified the DOM (added IDs), so we must serialize it back to string
  // to preserve those IDs in the final output.
  let newBody = doc.body.innerHTML;
  
  // Return HTML with replaced TOC
  return newBody.replace(/\[TOC\]/gi, tocHtml);
}

// App State
let currentFolder = null;
let currentFile = null;
let files = [];
let savedWorkspaces = [];
let isEditMode = false;
let originalContent = '';

// Sidebar State
let sidebarWidth = parseInt(localStorage.getItem('sidebarWidth')) || 280;
let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
let sidebarRight = localStorage.getItem('sidebarRight') === 'true';
let isResizing = false;

// Auto Refresh State
let refreshTimer = null;
let autoRefreshInterval = parseInt(localStorage.getItem('autoRefreshInterval')) ?? 10000; // default 10s

// DOM Elements
const fileList = document.getElementById('fileList');
// Drag and Drop (Root Container)
fileList.addEventListener('dragover', handleDragOver);
fileList.addEventListener('dragleave', handleDragLeave);
fileList.addEventListener('drop', handleDrop);
const workspaceInfo = document.getElementById('workspaceInfo');
const placeholder = document.getElementById('placeholder');
const contentView = document.getElementById('contentView');
const fileTitle = document.getElementById('fileTitle');
const markdownView = document.getElementById('markdownView');
const editorView = document.getElementById('editorView');
const editor = document.getElementById('editor');
const viewModeBtn = document.getElementById('viewModeBtn');
const editModeBtn = document.getElementById('editModeBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const newFileModal = document.getElementById('newFileModal');
const newFileName = document.getElementById('newFileName');
const createFileBtn = document.getElementById('createFileBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const recentWorkspaces = document.getElementById('recentWorkspaces');
const workspaceList = document.getElementById('workspaceList');
const footerPath = document.getElementById('footerPath');
const imageView = document.getElementById('imageView');
const imageDisplay = document.getElementById('imageDisplay');

// Rename Workspace Modal
const renameWorkspaceModal = document.getElementById('renameWorkspaceModal');
const workspaceNewName = document.getElementById('workspaceNewName');
const saveWorkspaceNameBtn = document.getElementById('saveWorkspaceNameBtn');
const cancelRenameBtn = document.getElementById('cancelRenameBtn');

// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const refreshIntervalInput = document.getElementById('refreshInterval');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

// Sidebar DOM Elements
const appContainer = document.getElementById('appContainer');
const sidebarWrapper = document.getElementById('sidebarWrapper');
const resizeHandle = document.getElementById('resizeHandle');
const collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const goHomeBtn = document.getElementById('goHomeBtn');
const refreshWorkspaceBtn = document.getElementById('refreshWorkspaceBtn');

// Context Menu
const contextMenu = document.getElementById('contextMenu');
const ctxNewFile = document.getElementById('ctxNewFile');

// Export Menu
const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');

// Event Listeners
viewModeBtn.addEventListener('click', () => setMode('view'));
editModeBtn.addEventListener('click', () => setMode('edit'));
saveBtn.addEventListener('click', saveFile);
cancelBtn.addEventListener('click', cancelEdit);
createFileBtn.addEventListener('click', createFile);
cancelModalBtn.addEventListener('click', hideNewFileModal);
newFileModal.querySelector('.modal-backdrop').addEventListener('click', hideNewFileModal);

newFileName.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') createFile();
});

refreshWorkspaceBtn.addEventListener('click', () => {
  if (currentFolder) {
    openSavedWorkspace(currentFolder);
  }
});

// Context Menu Events
ctxNewFile.addEventListener('click', () => {
  hideContextMenu();
  showNewFileModal(selectedDirectoryPath);
});

// Hide context menu on click outside
document.addEventListener('click', () => hideContextMenu());
window.addEventListener('blur', () => hideContextMenu());

// Rename Workspace Modal Events
saveWorkspaceNameBtn.addEventListener('click', saveWorkspaceRename);
cancelRenameBtn.addEventListener('click', hideRenameWorkspaceModal);
renameWorkspaceModal.querySelector('.modal-backdrop').addEventListener('click', hideRenameWorkspaceModal);
workspaceNewName.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveWorkspaceRename();
});

// Export Menu Events
exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle('show');
});

exportMenu.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const format = btn.dataset.format;
    exportFile(format);
    exportMenu.classList.remove('show');
  });
});

document.addEventListener('click', () => {
  exportMenu.classList.remove('show');
});

// Settings Modal Events
openSettingsBtn.addEventListener('click', showSettingsModal);
saveSettingsBtn.addEventListener('click', saveSettings);
cancelSettingsBtn.addEventListener('click', hideSettingsModal);
settingsModal.querySelector('.modal-backdrop').addEventListener('click', hideSettingsModal);
refreshIntervalInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveSettings();
});

// Menu Event Listeners (from main process)
// ipcRenderer and path are already required at top

ipcRenderer.on('menu-open-folder', () => openFolder());
ipcRenderer.on('menu-new-file', () => showNewFileModal());
ipcRenderer.on('menu-toggle-sidebar', () => toggleSidebar());
ipcRenderer.on('menu-swap-sidebar', () => toggleSidebarPosition());
ipcRenderer.on('menu-open-workspace', (event, wsPath) => openSavedWorkspace(wsPath));
ipcRenderer.on('menu-go-home', () => showHome());

async function showHome() {
  currentFolder = null;
  files = [];
  currentFile = null;
  
  // Stop auto-refresh
  stopAutoRefresh();
  
  // Reset UI
  fileList.innerHTML = '';
  workspaceInfo.innerHTML = `
    <div class="workspace-info-header">
      <span class="workspace-label">No folder opened</span>
    </div>
  `;
  refreshWorkspaceBtn.style.display = 'none';
  if (footerPath) footerPath.textContent = '';
  
  // Fetch latest workspaces
  try {
    savedWorkspaces = await window.api.getWorkspaces();
  } catch (err) {
    console.error('Failed to update workspaces:', err);
  }

  // Show recent workspaces
  recentWorkspaces.style.display = 'block';
  placeholder.style.display = 'flex';
  placeholder.querySelector('h2').textContent = 'Welcome to MD Viewer';
  placeholder.querySelector('p').textContent = 'Open a folder or create a new file to get started';
  
  // Hide editor/viewer
  contentView.style.display = 'none';
  
  renderRecentWorkspaces();
}

let isOpeningExternalFile = false;

ipcRenderer.on('open-external-file', async (event, filePath, isDir) => {
  isOpeningExternalFile = true;
  const folderPath = isDir ? filePath : path.dirname(filePath);
  const fileName = isDir ? null : path.basename(filePath);
  
  // If already in this folder, try to find and open
  if (currentFolder === folderPath || (!isDir && filePath.startsWith(currentFolder))) {
    const file = isDir ? null : findFileInTree(files, filePath);
    if (file || isDir) {
      if (file) openFile(file);
      return;
    }
  }
  
  const result = await window.api.openWorkspace(folderPath);
  if (result.success) {
    const folderName = folderPath.split(path.sep).pop();
    await window.api.saveWorkspace({ name: folderName, path: folderPath });
    
    setWorkspace(result.path, result.files);
    
    if (!isDir) {
      const file = findFileInTree(result.files, filePath);
      if (file) {
        openFile(file);
      }
    }
  }
});

function findFileInTree(tree, filePath) {
  for (const item of tree) {
    if (item.type === 'file' && item.path === filePath) {
      return item;
    }
    if (item.type === 'directory' && item.children) {
      const found = findFileInTree(item.children, filePath);
      if (found) {
        // Expand the parent folder
        localStorage.setItem(`folder_${item.path}`, 'true');
        return found;
      }
    }
  }
  return null;
}

// Sidebar Event Listeners
if (collapseSidebarBtn) {
  collapseSidebarBtn.addEventListener('click', toggleSidebar);
}
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', toggleSidebar);
}
if (goHomeBtn) {
  goHomeBtn.addEventListener('click', showHome);
}

// Resize Handle Events
resizeHandle.addEventListener('mousedown', startResize);
document.addEventListener('mousemove', doResize);
document.addEventListener('mouseup', stopResize);

// Initialize sidebar state
initSidebar();

// ========================================
// Sidebar Functions
// ========================================
function initSidebar() {
  // Apply saved width
  sidebarWrapper.style.width = sidebarWidth + 'px';
  
  // Apply collapsed state
  if (sidebarCollapsed) {
    sidebarWrapper.classList.add('collapsed');
  }
  
  // Apply position
  if (sidebarRight) {
    appContainer.classList.add('sidebar-right');
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  sidebarWrapper.classList.toggle('collapsed', sidebarCollapsed);
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
}

function toggleSidebarPosition() {
  sidebarRight = !sidebarRight;
  appContainer.classList.toggle('sidebar-right', sidebarRight);
  localStorage.setItem('sidebarRight', sidebarRight);
}

function startResize(e) {
  isResizing = true;
  resizeHandle.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
}

function doResize(e) {
  if (!isResizing) return;
  
  let newWidth;
  if (sidebarRight) {
    newWidth = window.innerWidth - e.clientX;
  } else {
    newWidth = e.clientX;
  }
  
  // Clamp width between min and max
  newWidth = Math.max(200, Math.min(500, newWidth));
  
  sidebarWidth = newWidth;
  sidebarWrapper.style.width = newWidth + 'px';
}

function stopResize() {
  if (!isResizing) return;
  
  isResizing = false;
  resizeHandle.classList.remove('resizing');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  // Save width to localStorage
  localStorage.setItem('sidebarWidth', sidebarWidth);
}

// Initialize - Load saved workspaces
initApp();

async function initApp() {
  savedWorkspaces = await window.api.getWorkspaces();
  renderRecentWorkspaces();
  
  // Wait a moment for any external file opening to trigger
  setTimeout(() => {
    if (isOpeningExternalFile) return;
    
    // Auto-open if only one workspace exists (e.g. the default one)
    if (savedWorkspaces.length === 1 && !currentFolder) {
      openSavedWorkspace(savedWorkspaces[0].path);
    }
  }, 200);
}

function renderRecentWorkspaces() {
  if (savedWorkspaces.length === 0) {
    recentWorkspaces.style.display = 'none';
    return;
  }
  
  recentWorkspaces.style.display = 'block';
  workspaceList.innerHTML = '';
  
  savedWorkspaces.forEach(workspace => {
    const item = document.createElement('div');
    item.className = 'workspace-item';
    item.dataset.path = workspace.path;
    
    item.innerHTML = `
      <span class="workspace-item-icon">📁</span>
      <div class="workspace-item-info">
        <div class="workspace-item-name">${workspace.name}</div>
        <div class="workspace-item-path">${workspace.path}</div>
      </div>
      <div class="workspace-item-actions">
        <button class="workspace-item-action rename" title="Rename workspace">✎</button>
        <button class="workspace-item-action remove" title="Remove from list">×</button>
      </div>
    `;
    
    // Click to open
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.workspace-item-action')) {
        openSavedWorkspace(workspace.path);
      }
    });
    
    // Rename button
    item.querySelector('.rename').addEventListener('click', (e) => {
      e.stopPropagation();
      showRenameWorkspaceModal(workspace);
    });
    
    // Remove button
    item.querySelector('.remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      savedWorkspaces = await window.api.removeWorkspace(workspace.path);
      renderRecentWorkspaces();
    });
    
    workspaceList.appendChild(item);
  });
}

let workspaceToRename = null;

function showRenameWorkspaceModal(workspace) {
  workspaceToRename = workspace;
  workspaceNewName.value = workspace.name;
  renameWorkspaceModal.style.display = 'flex';
  workspaceNewName.focus();
  workspaceNewName.select();
}

function hideRenameWorkspaceModal() {
  renameWorkspaceModal.style.display = 'none';
  workspaceToRename = null;
}

async function saveWorkspaceRename() {
  const newName = workspaceNewName.value.trim();
  if (newName && workspaceToRename) {
    const updatedWorkspace = { ...workspaceToRename, name: newName };
    savedWorkspaces = await window.api.saveWorkspace(updatedWorkspace);
    renderRecentWorkspaces();
    hideRenameWorkspaceModal();
  }
}

async function openSavedWorkspace(path) {
  const result = await window.api.openWorkspace(path);
  
  if (result.success) {
    setWorkspace(result.path, result.files);
  } else {
    alert('Workspace not found. It may have been moved or deleted.');
    savedWorkspaces = await window.api.removeWorkspace(path);
    renderRecentWorkspaces();
  }
}

function setWorkspace(folderPath, filesList) {
  currentFolder = folderPath;
  files = filesList;
  
  // Update workspace info
  const folderName = path.basename(currentFolder);
  workspaceInfo.innerHTML = `
    <div class="workspace-info-header">
      <span class="workspace-label">Workspace</span>
      <button id="refreshWorkspaceBtn" class="refresh-btn" title="Refresh workspace">↻</button>
    </div>
    <div class="workspace-path">${folderName}</div>
  `;
  
  // Re-attach listener to the newly created button
  document.getElementById('refreshWorkspaceBtn').addEventListener('click', () => {
    openSavedWorkspace(currentFolder);
  });
  
  // Update footer path
  if (footerPath) {
    footerPath.textContent = currentFolder;
    footerPath.title = currentFolder;
  }
  
  // Hide recent workspaces, show file list
  recentWorkspaces.style.display = 'none';
  renderFileList();
  
  // Start auto-refresh
  startAutoRefresh();
  
  // Show placeholder with message if no files
  if (files.length === 0) {
    placeholder.querySelector('h2').textContent = 'No markdown files found';
    placeholder.querySelector('p').textContent = 'Create a new file to get started';
    placeholder.style.display = 'flex';
  }
}

async function openFolder() {
  const result = await window.api.openFolder();
  
  if (result) {
    // Save to recent workspaces
    const folderName = result.path.split('/').pop();
    savedWorkspaces = await window.api.saveWorkspace({ name: folderName, path: result.path });
    
    setWorkspace(result.path, result.files);
  }
}

function renderFileList() {
  fileList.innerHTML = '';
  
  if (!files || files.length === 0) return;

  function renderTree(items, container) {
    items.forEach((item) => {
      if (item.type === 'directory') {
        const folderId = `folder_${item.path}`;
        const isExpanded = localStorage.getItem(folderId) === 'true';
        
        const folderDiv = document.createElement('div');
        folderDiv.className = `folder-item ${isExpanded ? 'expanded' : ''}`;
        folderDiv.dataset.path = item.path;
        folderDiv.innerHTML = `
          <span class="folder-toggle">▶</span>
          <span class="folder-icon">📁</span>
          <span class="file-item-name">${item.name}</span>
        `;
        
        // Drag and Drop (Drop Target)
        folderDiv.addEventListener('dragover', handleDragOver);
        folderDiv.addEventListener('dragleave', handleDragLeave);
        folderDiv.addEventListener('drop', handleDrop);
        
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        childrenDiv.dataset.path = item.path; // Propagate path to children container
        childrenDiv.style.display = isExpanded ? 'block' : 'none';

        // Drag and Drop for Expanded Area
        childrenDiv.addEventListener('dragover', handleDragOver);
        childrenDiv.addEventListener('dragleave', handleDragLeave);
        childrenDiv.addEventListener('drop', handleDrop);

        folderDiv.addEventListener('click', (e) => {
          // Don't toggle if clicking a button inside (future proofing)
          if (e.target.closest('.folder-toggle') || !e.target.closest('.folder-item')) {
             // specific logic
          }
          const nowExpanded = folderDiv.classList.toggle('expanded');
          childrenDiv.style.display = nowExpanded ? 'block' : 'none';
          localStorage.setItem(folderId, nowExpanded);
        });

        // Context menu for folders
        folderDiv.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showContextMenu(e.pageX, e.pageY, item.path);
        });
        
        container.appendChild(folderDiv);
        container.appendChild(childrenDiv);
        
        renderTree(item.children, childrenDiv);
      } else {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.dataset.path = item.path;
        fileDiv.draggable = true;
        
        if (currentFile && currentFile.path === item.path) {
          fileDiv.classList.add('active');
        }
        
        const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(item.name);
        const icon = isImage ? '🖼️' : '📄';

        fileDiv.innerHTML = `
          <span class="file-item-icon">${icon}</span>
          <span class="file-item-name">${item.name}</span>
        `;
        
        // Drag and Drop (Draggable)
        fileDiv.addEventListener('dragstart', handleDragStart);
        fileDiv.addEventListener('dragend', handleDragEnd);
        
        fileDiv.addEventListener('click', () => openFile(item));
        container.appendChild(fileDiv);
      }
    });
  }
  
  // Attach root listeners to fileList if not already handled by delegation logic (which handles specific nodes)
  // But for the "empty space" or "root" drop, we attach to the container
  // However, we must ensure we don't duplicate logic since renderFileList is called often.
  // The simplest way is to ensure fileList is clean or use a wrapper. 
  // Since we clear fileList.innerHTML, we can attach once externally or re-attach. 
  // Let's rely on init logic or checking if listener exists (hard with anonymous funcs without external ref).
  // BETTER: Attach root listeners to fileList in initialization code, not here.
  // But we need to ensure local drops don't bubble up and trigger root drop double.
  // handleDrop has stopPropagation, so it should be fine.

  renderTree(files, fileList);
}

let selectedDirectoryPath = null;

function showContextMenu(x, y, dirPath) {
  selectedDirectoryPath = dirPath;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.style.display = 'block';
}

function hideContextMenu() {
  contextMenu.style.display = 'none';
}

// ========================================
// Drag and Drop Functions
// ========================================

function handleDragStart(e) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('source-path', this.dataset.path);
  this.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('drag-over');
  
  let targetFolderPath;
  
  // Check if dropping on root container (fileList has id='fileList')
  if (this.id === 'fileList') {
    targetFolderPath = currentFolder;
  } else {
    targetFolderPath = this.dataset.path;
  }
  
  const sourcePath = e.dataTransfer.getData('source-path');
  
  // Handle internal file move
  if (sourcePath && targetFolderPath) {
    if (sourcePath === targetFolderPath) return; 
    
    // Check if moving file to its own parent folder (no-op)
    const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf(path.sep));
    if (sourceDir === targetFolderPath) return;

    const result = await window.api.moveFile(sourcePath, targetFolderPath);
    
    if (result.success) {
      await refreshDirectory();
    } else {
      alert('Move failed: ' + result.error);
    }
  }
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

async function openFile(file) {
  // Check if image
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file.name)) {
    currentFile = file;
    
    // Update active state
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.toggle('active', item.dataset.path === file.path);
    });

    // Show content view
    placeholder.style.display = 'none';
    contentView.style.display = 'flex';
    
    // Update title
    fileTitle.textContent = file.name;
    
    // Show image view
    markdownView.style.display = 'none';
    editorView.style.display = 'none';
    imageView.style.display = 'flex';
    imageDisplay.src = file.path; // Local file path
    
    // Disable edit mode toggle
    editModeBtn.disabled = true;
    editModeBtn.style.opacity = '0.5';
    viewModeBtn.click(); // Ensure view mode is active
    
    return;
  }

  // Handle Markdown Files
  const result = await window.api.readFile(file.path);
  
  if (result.success) {
    currentFile = file;
    originalContent = result.content;
    
    // Update active state
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.toggle('active', item.dataset.path === file.path);
    });
    
    // Show content view
    placeholder.style.display = 'none';
    contentView.style.display = 'flex';
    
    // Update title
    fileTitle.textContent = file.name.replace('.md', '');
    
    // Enable edit mode toggle
    editModeBtn.disabled = false;
    editModeBtn.style.opacity = '1';
    
    // Show markdown view
    imageView.style.display = 'none';
    
    // Parse Markdown
    let html = marked.parse(result.content);
    
    // Generate TOC
    html = generateTOC(html);
    
    // Render HTML
    markdownView.innerHTML = html;
    
    // Render diagrams
    await renderMermaidDiagrams();
    renderFlowcharts();
    
    // Retrieve KaTeX for inline math if needed (not captured by code blocks)
    // Basic inline math support $$...$$
    renderInlineMath();
    
    // Set to view mode
    setMode('view');
  }
}

// Global link interceptor (Capture phase to ensure we beat default behavior)
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  
  // Only intercept links inside the markdown view
  // Actually, we should intercept ALL links in the app to prevent navigation, 
  // unless they are specifically handled UI buttons (which don't use href usually).
  // But to be safe, if it has an href, it's a link we want to control.
  // if (!markdownView.contains(link)) return; // Removed to be more aggressive
  
  const href = link.getAttribute('href');
  if (!href) return;
  
  // Prevent ALL default navigation for links immediately
  e.preventDefault();
  e.stopPropagation();
  
  console.log('Intercepted click:', href);

  // Handle anchor links (TOC)
  if (href.startsWith('#')) {
    const targetId = decodeURIComponent(href.substring(1));
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }
  
  // Handle external links
  if (href.startsWith('http') || href.startsWith('mailto:')) {
    await window.api.openExternal(href);
    return;
  }
  
  // Handle local file links
  
  // Resolve path relative to current file
  try {
    const currentDir = currentFile.path.substring(0, currentFile.path.lastIndexOf(path.sep));
    const targetPath = path.resolve(currentDir, href);
    console.log('Resolving:', href, '->', targetPath);
    
    // Find file in our tree
    const targetFile = findFileInTree(files, targetPath);
    
    if (targetFile) {
      openFile(targetFile);
    } else {
       // Try direct read
       const result = await window.api.readFile(targetPath);
       if (result.success) {
         const tempFile = {
           name: path.basename(targetPath),
           path: targetPath,
           type: 'file'
         };
         openFile(tempFile);
       } else {
         alert(`File not found: ${href}\nResolved to: ${targetPath}`);
       }
    }
  } catch (err) {
    console.error('Link navigation error:', err);
    alert('Link error: ' + err.message);
  }
}, true); // Use capture phase

function renderInlineMath() {
   // Find all text and replace $$...$$ or $...$ with katex
   // Note: This is a simple implementation. For robust inline math, a marked extension is better.
   // But we'll do a post-pass DOM replacement for now which is safer than regexing HTML string.
   // Skipping complex inline math for now to avoid breaking HTML tags, but block math via code block is supported.
   // To support inline $$..$$:
   const walker = document.createTreeWalker(markdownView, NodeFilter.SHOW_TEXT);
   let node;
   const nodesToReplace = [];
   
   while(node = walker.nextNode()) {
     if (node.nodeValue.includes('$$')) {
       nodesToReplace.push(node);
     }
   }
   
   nodesToReplace.forEach(node => {
     const parts = node.nodeValue.split('$$');
     if (parts.length < 3) return; // No pair
     
     const fragment = document.createDocumentFragment();
     parts.forEach((part, i) => {
       if (i % 2 === 1) { // Math part
         const span = document.createElement('span');
         try {
            katex.render(part, span, { throwOnError: false, displayMode: false });
            fragment.appendChild(span);
         } catch(e) {
            fragment.appendChild(document.createTextNode('$$' + part + '$$'));
         }
       } else { // Text part
         fragment.appendChild(document.createTextNode(part));
       }
     });
     node.parentNode.replaceChild(fragment, node);
   });
}

function setMode(mode) {
  isEditMode = mode === 'edit';
  
  viewModeBtn.classList.toggle('active', !isEditMode);
  editModeBtn.classList.toggle('active', isEditMode);
  
  if (imageView.style.display === 'flex') {
    markdownView.style.display = 'none';
    editorView.style.display = 'none';
  } else {
    markdownView.style.display = isEditMode ? 'none' : 'block';
    editorView.style.display = isEditMode ? 'flex' : 'none';
  }
  
  if (isEditMode) {
    editor.value = originalContent;
    editor.focus();
  }
}

async function saveFile() {
  if (!currentFile) return;
  
  const content = editor.value;
  const result = await window.api.saveFile(currentFile.path, content);
  
  if (result.success) {
    originalContent = content;
    let html = marked.parse(content);
    html = generateTOC(html);
    markdownView.innerHTML = html;
    
    await renderMermaidDiagrams();
    renderFlowcharts();
    renderInlineMath();
    
    setMode('view');
  } else {
    alert('Failed to save: ' + result.error);
  }
}

function cancelEdit() {
  editor.value = originalContent;
  setMode('view');
}

function showNewFileModal(targetPath) {
  selectedDirectoryPath = targetPath || currentFolder;
  newFileModal.style.display = 'flex';
  newFileName.value = '';
  newFileName.focus();
}

function hideNewFileModal() {
  newFileModal.style.display = 'none';
}

async function createFile() {
  const fileName = newFileName.value.trim();
  if (!fileName || !selectedDirectoryPath) {
    if (!fileName) alert('Please enter a file name');
    return;
  }
  
  const result = await window.api.createFile(selectedDirectoryPath, fileName);
  if (result.success) {
    // Refresh the entire tree from disk to reflect changes
    const workspaceResult = await window.api.openWorkspace(currentFolder);
    files = workspaceResult.files;
    renderFileList();
    hideNewFileModal();
    
    // Attempt to find and open the new file
    const newFile = findFileInTree(files, result.path);
    if (newFile) {
      openFile(newFile);
    }
  } else {
    alert('Failed to create file: ' + result.error);
  }
}

// ========================================
// Auto Refresh & Settings
// ========================================

function startAutoRefresh() {
  stopAutoRefresh();
  if (autoRefreshInterval > 0 && currentFolder) {
    refreshTimer = setInterval(() => {
      if (currentFolder && !isEditMode) { // Don't refresh while editing to avoid conflicts
        refreshDirectory();
      }
    }, autoRefreshInterval);
  }
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function refreshDirectory() {
  if (!currentFolder) return;
  const result = await window.api.openWorkspace(currentFolder);
  if (result.success) {
    // Only update if files changed to avoid flashing
    const newFilesStr = JSON.stringify(result.files);
    const oldFilesStr = JSON.stringify(files);
    
    if (newFilesStr !== oldFilesStr) {
      files = result.files;
      renderFileList();
    }
  }
}

function showSettingsModal() {
  refreshIntervalInput.value = autoRefreshInterval / 1000;
  settingsModal.style.display = 'flex';
  refreshIntervalInput.focus();
}

function hideSettingsModal() {
  settingsModal.style.display = 'none';
}

function saveSettings() {
  const seconds = parseInt(refreshIntervalInput.value);
  if (!isNaN(seconds)) {
    autoRefreshInterval = seconds * 1000;
    localStorage.setItem('autoRefreshInterval', autoRefreshInterval);
    
    // Restart refresh if we have a workspace
    if (currentFolder) {
      startAutoRefresh();
    }
    
    hideSettingsModal();
  }
}

// ========================================
// Export Logic
// ========================================

async function exportFile(format) {
  if (!currentFile) return;

  const content = markdownView.innerHTML;
  const title = currentFile.name.replace('.md', '');
  
  // Create a full HTML document for export
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: #fff;
        }
        h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
        h1 { padding-bottom: 0.3em; font-size: 2em; border-bottom: 1px solid #eaecef; }
        h2 { padding-bottom: 0.3em; font-size: 1.5em; border-bottom: 1px solid #eaecef; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        blockquote { padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; margin: 0; }
        code { padding: 0.2em 0.4em; margin: 0; font-size: 85%; background-color: rgba(27,31,35,0.05); border-radius: 3px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Courier, monospace; }
        pre { padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; background-color: #f6f8fa; border-radius: 3px; }
        pre code { background-color: transparent; padding: 0; }
        table { border-spacing: 0; border-collapse: collapse; width: 100%; margin-top: 0; margin-bottom: 16px; }
        table th, table td { padding: 6px 13px; border: 1px solid #dfe2e5; }
        table tr { background-color: #fff; border-top: 1px solid #c6cbd1; }
        table tr:nth-child(2n) { background-color: #f6f8fa; }
        img { max-width: 100%; box-sizing: content-box; background-color: #fff; }
        hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #e1e4e8; border: 0; }
        .mermaid { text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;

  const result = await window.api.exportFile({
    content: fullHtml,
    format: format,
    defaultName: `${title}.${format}`
  });

  if (result.success) {
    console.log(`Successfully exported to ${result.filePath}`);
  } else if (result.error) {
    alert('Export failed: ' + result.error);
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + S to save
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (isEditMode && currentFile) {
      saveFile();
    }
  }
  
  // Escape to cancel edit
  if (e.key === 'Escape') {
    if (newFileModal.style.display === 'flex') {
      hideNewFileModal();
    } else if (isEditMode) {
      cancelEdit();
    }
  }
  
  // Cmd/Ctrl + E to toggle edit
  if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
    e.preventDefault();
    if (currentFile) {
      setMode(isEditMode ? 'view' : 'edit');
    }
  }
  
  // Cmd/Ctrl + B to toggle sidebar
  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    e.preventDefault();
    toggleSidebar();
  }
});
