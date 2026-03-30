/* DOM Elements */
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const resizer = document.getElementById('resizer');
const workspace = document.getElementById('workspace');

const wordCountEl = document.getElementById('word-count');
const charCountEl = document.getElementById('char-count');
const readTimeEl = document.getElementById('read-time');
const saveStatusEl = document.getElementById('save-status');
const toastEl = document.getElementById('toast');

/* View & Theme Buttons */
const themeToggle = document.getElementById('theme-toggle');
const themeSelect = document.getElementById('theme-select');
const viewBtns = document.querySelectorAll('.view-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

/* File Buttons */
const importBtn = document.getElementById('import-btn');
const fileInput = document.getElementById('file-input');
const downloadMdBtn = document.getElementById('download-md-btn');
const exportHtmlBtn = document.getElementById('export-html-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const copyHtmlBtn = document.getElementById('copy-html-btn');

/* State */
const LOCAL_STORAGE_KEY = 'marky_content';
let isSyncingLeft = false;
let isSyncingRight = false;
let saveTimeout;

/* Initialization */
function init() {
    // Configure marked.js with highlight.js
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true,
        gfm: true
    });

    // Load initial content from local storage or set default
    const savedContent = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedContent) {
        editor.value = savedContent;
    } else {
        editor.value = `# Welcome to Marky 👋\n\nA modern, minimal Markdown Editor.\n\n## Features\n- **Live Preview:** See changes as you type.\n- *Syntax Highlighting:* For code blocks.\n- \`Local Storage\`: Auto-saves your work.\n\n\`\`\`javascript\n// Here's some code\nfunction greet() {\n  console.log("Hello World!");\n}\n\`\`\`\n\n> "Simplicity is the ultimate sophistication." - Leonardo Da Vinci\n\n### Enjoy your writing!`;
    }

    renderContent();
    updateStats();
    setupEventListeners();
}

/* Core Rendering */
function renderContent() {
    const markdownText = editor.value;
    const htmlContent = marked.parse(markdownText);
    preview.innerHTML = htmlContent;
    
    // Highlight block
    preview.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    updateStats();
    triggerAutoSave();
}

function updateStats() {
    const text = editor.value;
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200); // avg 200 words per min

    wordCountEl.textContent = `${wordCount} words`;
    charCountEl.textContent = `${charCount} chars`;
    readTimeEl.textContent = `${readTime} min read`;
}

function triggerAutoSave() {
    saveStatusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, editor.value);
        saveStatusEl.innerHTML = `<i class="fa-solid fa-check-circle"></i> Saved`;
    }, 1000);
}

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

/* Event Listeners Setup */
function setupEventListeners() {
    // Editor input
    editor.addEventListener('input', () => {
        // Debounce rendering slightly for performance on huge files
        renderContent();
    });

    // Scroll Sync
    editor.addEventListener('scroll', () => {
        if (!isSyncingLeft) {
            isSyncingRight = true;
            const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
            if(preview.parentElement.scrollHeight > preview.parentElement.clientHeight) {
                preview.parentElement.scrollTop = percentage * (preview.parentElement.scrollHeight - preview.parentElement.clientHeight);
            }
        }
        isSyncingLeft = false;
    });

    preview.parentElement.addEventListener('scroll', () => {
        if (!isSyncingRight) {
            isSyncingLeft = true;
            const percentage = preview.parentElement.scrollTop / (preview.parentElement.scrollHeight - preview.parentElement.clientHeight);
            if(editor.scrollHeight > editor.clientHeight) {
                editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
            }
        }
        isSyncingRight = false;
    });

    // Toolbar Actions
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyFormat(btn.dataset.action);
        });
    });

    // Keyboard Shortcuts
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); applyFormat('bold'); }
            if (e.key === 'i') { e.preventDefault(); applyFormat('italic'); }
        }
    });

    // View Toggles
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'fullscreen-btn') {
                toggleFullScreen();
                return;
            }
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.body.classList.remove('view-split', 'view-editor', 'view-preview');
            document.body.classList.add(`view-${btn.dataset.view}`);
        });
    });

    // Theme & Mode Toggles
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('mode-dark');
        const isDark = document.body.classList.contains('mode-dark');
        themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        
        // Switch hljs theme link
        const hljsLink = document.getElementById('hljs-theme');
        if (isDark) {
            hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        } else {
            hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        }
    });

    // Drag API
    workspace.addEventListener('dragover', (e) => {
        e.preventDefault();
        workspace.classList.add('drag-active');
        if (!document.querySelector('.drag-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'drag-overlay';
            overlay.innerHTML = 'Drop Markdown File Here';
            workspace.appendChild(overlay);
        }
    });
    
    workspace.addEventListener('dragleave', () => {
        workspace.classList.remove('drag-active');
    });
    
    workspace.addEventListener('drop', (e) => {
        e.preventDefault();
        workspace.classList.remove('drag-active');
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.md') || file.type === 'text/markdown' || file.type === '') {
                readFile(file);
            } else {
                showToast('Please upload a .md file');
            }
        }
    });

    // File Input Import
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            readFile(e.target.files[0]);
        }
    });

    // Export Options
    downloadMdBtn.addEventListener('click', downloadMarkdown);
    exportHtmlBtn.addEventListener('click', exportHTML);
    exportPdfBtn.addEventListener('click', exportPDF);
    copyHtmlBtn.addEventListener('click', copyHTMLToClipboard);

    // Resizer Logic (Horizontal only for MVP)
    let isResizing = false;
    resizer.addEventListener('mousedown', (e) => {
        if (document.body.classList.contains('view-split')) {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            // prevent text selection while resizing
            document.body.style.userSelect = 'none';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const containerWidth = workspace.clientWidth;
        // Don't allow panes to get smaller than 10%
        if (e.clientX > containerWidth * 0.1 && e.clientX < containerWidth * 0.9) {
            const leftWidth = (e.clientX / containerWidth) * 100;
            const editorPane = document.getElementById('editor-pane');
            editorPane.style.flex = `0 0 ${leftWidth}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    });
}

function applyFormat(action) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selectedText = text.substring(start, end);
    let newText = '';
    let cursorOffset = 0;

    switch(action) {
        case 'bold':
            newText = `**${selectedText || 'bold text'}**`;
            cursorOffset = selectedText ? 0 : 2;
            break;
        case 'italic':
            newText = `*${selectedText || 'italic text'}*`;
            cursorOffset = selectedText ? 0 : 1;
            break;
        case 'heading':
            newText = `\n# ${selectedText || 'Heading'}\n`;
            cursorOffset = selectedText ? 0 : 3;
            break;
        case 'link':
            newText = `[${selectedText || 'link text'}](http://)`;
            cursorOffset = selectedText ? 0 : 1;
            break;
        case 'code':
            newText = `\`${selectedText || 'code'}\``;
            cursorOffset = selectedText ? 0 : 1;
            break;
        case 'list':
            newText = `\n- ${selectedText || 'List item'}\n`;
            cursorOffset = selectedText ? 0 : 3;
            break;
    }

    editor.value = text.substring(0, start) + newText + text.substring(end);
    renderContent();
    editor.focus();
    
    // Set cursor position back
    if (!selectedText) {
        let actualOffset = start + cursorOffset;
        if(action === 'heading' || action === 'list') { actualOffset = start + cursorOffset; }
        editor.selectionStart = actualOffset;
        editor.selectionEnd = editor.selectionStart + (newText.length - (cursorOffset * 2));
    } else {
        editor.selectionStart = start;
        editor.selectionEnd = start + newText.length;
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            showToast(`Fullscreen error: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        editor.value = e.target.result;
        renderContent();
        showToast('File loaded successfully');
    };
    reader.readAsText(file);
}

function downloadMarkdown() {
    const blob = new Blob([editor.value], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Markdown downloaded');
}

function exportHTML() {
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Exported Document</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #333; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
        code { font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace; }
        blockquote { padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; }
        table { border-spacing: 0; border-collapse: collapse; }
        table th, table td { padding: 6px 13px; border: 1px solid #dfe2e5; }
        img { max-width: 100%; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    ${preview.innerHTML}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
    showToast('HTML Exported');
}

function exportPDF() {
    showToast('Generating PDF...');
    const element = document.createElement('div');
    element.innerHTML = preview.innerHTML;
    element.className = 'markdown-body';
    
    const wrapper = document.createElement('div');
    wrapper.appendChild(element);
    
    Object.assign(wrapper.style, {
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        color: '#000',
        background: '#fff'
    });
    
    const opt = {
        margin:       0.5,
        filename:     'document.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(wrapper).save().then(() => {
        showToast('PDF Exported');
    });
}

function copyHTMLToClipboard() {
    navigator.clipboard.writeText(preview.innerHTML).then(() => {
        showToast('HTML copied to clipboard!');
    }).catch(err => {
        showToast('Failed to copy');
        console.error('Could not copy text: ', err);
    });
}

// Start app
init();
