# MD Viewer

> A beautiful, modern Markdown viewer and editor for macOS.

![MD Viewer Screenshot](./assets/screenshot1.png)

## Overview

MD Viewer is a lightweight Electron-based application designed for a seamless writing and reading experience. It supports folder-based workflows, real-time preview, and diagram rendering.

## Features

- **📂 Folder-based Workflow**: Open any folder to browse and manage your markdown files.
- **🌲 Hierarchical Tree View**: Navigate deeply nested file structures with ease.
- **📝 Real-time Editor**: Write markdown with instant preview.
- **📊 Mermaid Diagrams**: Native support for rendering flowcharts, sequence diagrams, and more.
- **🎨 Syntax Highlighting**: Beautiful code block highlighting using `highlight.js`.
- **📤 Export Options**: Export your documents to **HTML**, **PDF**, or **Word (.docx)**.
- **⚙️ Customization**:
  - Resizable sidebar.
  - Sidebar positioning (Left/Right).
  - Auto-refresh interval settings.
- **🖥️ Native Feel**: Designed to match the macOS aesthetic with dark mode support.

## Terminal Integration

Launch MD Viewer directly from your terminal.

**Setup for Zsh (macOS):**

1. Open your config:
   ```bash
   nano ~/.zshrc
   ```
2. Add the alias:
   ```bash
   alias md='open -a "MD Viewer" --args'
   ```
3. Reload config:
   ```bash
   source ~/.zshrc
   ```
4. Usage:
   ```bash
   md .           # Open current directory
   md notes/      # Open specific folder
   md README.md   # Open specific file
   ```

## Development

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run in Development Mode**

   ```bash
   npm run dev
   ```

3. **Build for macOS**
   ```bash
   npm run build
   ```
   Artifacts will be in the `dist/` directory.

## Tech Stack

- **Electron**: App runtime.
- **Marked**: Markdown parsing.
- **Highlight.js**: Syntax highlighting.
- **Mermaid**: Diagram generation.
- **Vanilla JS/CSS**: Lightweight, dependency-free UI logic.

## License

MIT
