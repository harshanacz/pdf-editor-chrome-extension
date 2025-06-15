// Initialize PDF.js
import * as pdfjsLib from '../lib/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.mjs';

// ...rest of your code

// Variables to store editor state
let pdfDoc = null;
let currentPage = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let currentTool = 'cursor';
let annotations = [];
let currentAnnotation = null;
let currentColor = '#ff0000';
let currentLineWidth = 2;
let currentTextSize = 16;
let currentFontFamily = 'Arial, sans-serif';
let isDragging = false;
let startX, startY;

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const pdfUrl = urlParams.get('pdf');
const filename = urlParams.get('filename') || 'document.pdf';

// DOM Elements
const pdfContainer = document.getElementById('pdf-container');
const annotationLayer = document.getElementById('annotation-layer');
const propertiesPanel = document.getElementById('properties-panel');

// Tool buttons
const cursorToolBtn = document.getElementById('cursor-tool');
const handToolBtn = document.getElementById('hand-tool');
const textToolBtn = document.getElementById('text-tool');
const highlightToolBtn = document.getElementById('highlight-tool');
const drawToolBtn = document.getElementById('draw-tool');
const noteToolBtn = document.getElementById('note-tool');
const saveBtn = document.getElementById('save-btn');
const downloadBtn = document.getElementById('download-btn');

// Property controls
const colorOptions = document.querySelectorAll('.color-option');
const lineWidthInput = document.getElementById('line-width');
const textSizeSelect = document.getElementById('text-size');
const fontFamilySelect = document.getElementById('font-family');

// Initialize PDF document
async function initPDF() {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    pdfDoc = await loadingTask.promise;
    
    // Initial page render
    renderPage(currentPage);
    
    // Show properties panel
    togglePropertiesPanel(true);
    
    console.log(`PDF loaded successfully. Number of pages: ${pdfDoc.numPages}`);
  } catch (error) {
    console.error('Error loading PDF:', error);
    alert('Failed to load PDF. Please try again with a different file.');
  }
}

// Render a page
function renderPage(pageNum) {
  pageRendering = true;
  
  // Remove any existing canvas
  const existingCanvas = pdfContainer.querySelector('canvas');
  if (existingCanvas) {
    pdfContainer.removeChild(existingCanvas);
  }
  
  // Get the page
  pdfDoc.getPage(pageNum).then(function(page) {
    // Calculate the scale to fit the window
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Set container dimensions
    pdfContainer.style.width = `${viewport.width}px`;
    pdfContainer.style.height = `${viewport.height}px`;
    
    // Set annotation layer dimensions
    annotationLayer.style.width = `${viewport.width}px`;
    annotationLayer.style.height = `${viewport.height}px`;
    
    // Render the page content
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    const renderTask = page.render(renderContext);
    
    renderTask.promise.then(function() {
      pageRendering = false;
      
      // Render any annotations for this page
      renderAnnotations(pageNum);
      
      if (pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
}

// Render annotations for the current page
function renderAnnotations(pageNum) {
  // Clear existing annotations
  annotationLayer.innerHTML = '';
  
  // Filter annotations for the current page
  const currentAnnotations = annotations.filter(a => a.pageNum === pageNum);
  
  // Render each annotation
  currentAnnotations.forEach(annotation => {
    switch (annotation.type) {
      case 'text':
        createTextAnnotation(annotation);
        break;
      case 'highlight':
        createHighlightAnnotation(annotation);
        break;
      case 'draw':
        createDrawAnnotation(annotation);
        break;
      case 'note':
        createNoteAnnotation(annotation);
        break;
    }
  });
}

// Create text annotation element
function createTextAnnotation(annotation) {
  const textElement = document.createElement('div');
  textElement.className = 'annotation text-annotation';
  textElement.style.left = `${annotation.x}px`;
  textElement.style.top = `${annotation.y}px`;
  textElement.style.color = annotation.color;
  textElement.style.fontSize = `${annotation.textSize}px`;
  textElement.style.fontFamily = annotation.fontFamily;
  textElement.textContent = annotation.text;
  textElement.contentEditable = true;
  textElement.dataset.id = annotation.id;
  
  // Events for text editing
  textElement.addEventListener('focus', (e) => {
    currentAnnotation = annotation;
    updatePropertiesPanel();
  });
  
  textElement.addEventListener('blur', (e) => {
    annotation.text = e.target.textContent;
  });
  
  annotationLayer.appendChild(textElement);
}

// Create highlight annotation element
function createHighlightAnnotation(annotation) {
  const highlightElement = document.createElement('div');
  highlightElement.className = 'annotation highlight-annotation';
  highlightElement.style.left = `${annotation.x}px`;
  highlightElement.style.top = `${annotation.y}px`;
  highlightElement.style.width = `${annotation.width}px`;
  highlightElement.style.height = `${annotation.height}px`;
  highlightElement.style.backgroundColor = annotation.color;
  highlightElement.dataset.id = annotation.id;
  
  highlightElement.addEventListener('click', (e) => {
    currentAnnotation = annotation;
    updatePropertiesPanel();
  });
  
  annotationLayer.appendChild(highlightElement);
}

// Create draw annotation element
function createDrawAnnotation(annotation) {
  const drawElement = document.createElement('svg');
  drawElement.className = 'annotation draw-annotation';
  drawElement.style.position = 'absolute';
  drawElement.style.left = `${annotation.x}px`;
  drawElement.style.top = `${annotation.y}px`;
  drawElement.style.width = `${annotation.width}px`;
  drawElement.style.height = `${annotation.height}px`;
  drawElement.dataset.id = annotation.id;
  
  // Create path from points
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let d = `M ${annotation.points[0].x} ${annotation.points[0].y}`;
  
  for (let i = 1; i < annotation.points.length; i++) {
    d += ` L ${annotation.points[i].x} ${annotation.points[i].y}`;
  }
  
  path.setAttribute('d', d);
  path.setAttribute('stroke', annotation.color);
  path.setAttribute('stroke-width', annotation.lineWidth);
  path.setAttribute('fill', 'none');
  
  drawElement.appendChild(path);
  annotationLayer.appendChild(drawElement);
}

// Create note annotation element
function createNoteAnnotation(annotation) {
  const noteElement = document.createElement('div');
  noteElement.className = 'annotation note-annotation';
  noteElement.style.left = `${annotation.x}px`;
  noteElement.style.top = `${annotation.y}px`;
  noteElement.dataset.id = annotation.id;
  
  // Add note icon
  const noteIcon = document.createElement('span');
  noteIcon.innerHTML = '📝';
  noteElement.appendChild(noteIcon);
  
  // Add event to show popup
  noteElement.addEventListener('click', (e) => {
    currentAnnotation = annotation;
    showNotePopup(annotation, noteElement);
  });
  
  annotationLayer.appendChild(noteElement);
}

// Show note popup
function showNotePopup(annotation, noteElement) {
  // Remove any existing popup
  const existingPopup = document.querySelector('.note-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.className = 'note-popup';
  
  // Position the popup
  const rect = noteElement.getBoundingClientRect();
  popup.style.left = `${rect.right + 5}px`;
  popup.style.top = `${rect.top}px`;
  
  // Create textarea
  const textarea = document.createElement('textarea');
  textarea.className = 'note-textarea';
  textarea.value = annotation.text || '';
  textarea.placeholder = 'Enter note text...';
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.style.marginTop = '5px';
  
  saveButton.addEventListener('click', () => {
    annotation.text = textarea.value;
    popup.remove();
  });
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.marginTop = '5px';
  closeButton.style.marginLeft = '5px';
  
  closeButton.addEventListener('click', () => {
    popup.remove();
  });
  
  // Add elements to popup
  popup.appendChild(textarea);
  popup.appendChild(saveButton);
  popup.appendChild(closeButton);
  
  // Add popup to document
  document.body.appendChild(popup);
  
  // Focus textarea
  textarea.focus();
}

// Update properties panel with current annotation settings
function updatePropertiesPanel() {
  if (!currentAnnotation) return;
  
  // Update color selections
  colorOptions.forEach(option => {
    if (option.dataset.color === currentAnnotation.color) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Update line width
  if (currentAnnotation.lineWidth) {
    lineWidthInput.value = currentAnnotation.lineWidth;
  }
  
  // Update text size
  if (currentAnnotation.textSize) {
    textSizeSelect.value = currentAnnotation.textSize;
  }
  
  // Update font family
  if (currentAnnotation.fontFamily) {
    fontFamilySelect.value = currentAnnotation.fontFamily;
  }
}

// Toggle properties panel visibility
function togglePropertiesPanel(show) {
  if (show) {
    propertiesPanel.classList.add('visible');
  } else {
    propertiesPanel.classList.remove('visible');
  }
}

// Set active tool
function setActiveTool(tool) {
  currentTool = tool;
  
  // Update tool button states
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach(btn => btn.classList.remove('active'));
  
  // Set active class on selected tool
  document.getElementById(`${tool}-tool`).classList.add('active');
  
  // Update annotation layer behavior
  if (tool === 'hand') {
    annotationLayer.classList.remove('active');
    pdfContainer.style.cursor = 'grab';
  } else {
    annotationLayer.classList.add('active');
    
    switch (tool) {
      case 'cursor':
        pdfContainer.style.cursor = 'default';
        break;
      case 'text':
        pdfContainer.style.cursor = 'text';
        break;
      case 'highlight':
        pdfContainer.style.cursor = 'crosshair';
        break;
      case 'draw':
        pdfContainer.style.cursor = 'crosshair';
        break;
      case 'note':
        pdfContainer.style.cursor = 'pointer';
        break;
    }
  }
}

// Generate a unique ID for annotations
function generateId() {
  return 'ann_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// Event Listeners

// Tool selection
cursorToolBtn.addEventListener('click', () => setActiveTool('cursor'));
handToolBtn.addEventListener('click', () => setActiveTool('hand'));
textToolBtn.addEventListener('click', () => setActiveTool('text'));
highlightToolBtn.addEventListener('click', () => setActiveTool('highlight'));
drawToolBtn.addEventListener('click', () => setActiveTool('draw'));
noteToolBtn.addEventListener('click', () => setActiveTool('note'));

// Color selection
colorOptions.forEach(option => {
  option.addEventListener('click', (e) => {
    // Update selected color
    currentColor = e.target.dataset.color;
    
    // Update selected class
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    e.target.classList.add('selected');
    
    // Update current annotation if exists
    if (currentAnnotation) {
      currentAnnotation.color = currentColor;
      renderAnnotations(currentPage);
    }
  });
});

// Line width change
lineWidthInput.addEventListener('change', (e) => {
  currentLineWidth = parseInt(e.target.value);
  
  if (currentAnnotation && currentAnnotation.lineWidth !== undefined) {
    currentAnnotation.lineWidth = currentLineWidth;
    renderAnnotations(currentPage);
  }
});

// Text size change
textSizeSelect.addEventListener('change', (e) => {
  currentTextSize = parseInt(e.target.value);
  
  if (currentAnnotation && currentAnnotation.textSize !== undefined) {
    currentAnnotation.textSize = currentTextSize;
    renderAnnotations(currentPage);
  }
});

// Font family change
fontFamilySelect.addEventListener('change', (e) => {
  currentFontFamily = e.target.value;
  
  if (currentAnnotation && currentAnnotation.fontFamily !== undefined) {
    currentAnnotation.fontFamily = currentFontFamily;
    renderAnnotations(currentPage);
  }
});

// Mouse events for annotation layer
annotationLayer.addEventListener('mousedown', (e) => {
  if (currentTool === 'hand') return;
  
  const rect = annotationLayer.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  isDragging = true;
  
  switch (currentTool) {
    case 'text':
      // Create new text annotation
      const textAnnotation = {
        id: generateId(),
        type: 'text',
        pageNum: currentPage,
        x: startX,
        y: startY,
        text: 'Enter text here',
        color: currentColor,
        textSize: currentTextSize,
        fontFamily: currentFontFamily
      };
      
      annotations.push(textAnnotation);
      currentAnnotation = textAnnotation;
      renderAnnotations(currentPage);
      
      // Focus the newly created text element
      setTimeout(() => {
        const textElement = annotationLayer.querySelector(`[data-id="${textAnnotation.id}"]`);
        if (textElement) {
          textElement.focus();
          // Select all text for easy replacement
          const range = document.createRange();
          range.selectNodeContents(textElement);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }, 0);
      
      // End dragging immediately as we don't need to track movement for text
      isDragging = false;
      break;
      
    case 'draw':
      // Create new draw annotation
      const drawAnnotation = {
        id: generateId(),
        type: 'draw',
        pageNum: currentPage,
        x: 0,
        y: 0,
        width: annotationLayer.clientWidth,
        height: annotationLayer.clientHeight,
        points: [{ x: startX, y: startY }],
        color: currentColor,
        lineWidth: currentLineWidth
      };
      
      annotations.push(drawAnnotation);
      currentAnnotation = drawAnnotation;
      break;
      
    case 'note':
      // Create new note annotation
      const noteAnnotation = {
        id: generateId(),
        type: 'note',
        pageNum: currentPage,
        x: startX,
        y: startY,
        text: '',
        color: currentColor
      };
      
      annotations.push(noteAnnotation);
      currentAnnotation = noteAnnotation;
      renderAnnotations(currentPage);
      
      // Show note popup immediately
      setTimeout(() => {
        const noteElement = annotationLayer.querySelector(`[data-id="${noteAnnotation.id}"]`);
        if (noteElement) {
          showNotePopup(noteAnnotation, noteElement);
        }
      }, 0);
      
      // End dragging immediately
      isDragging = false;
      break;
  }
});

annotationLayer.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  
  const rect = annotationLayer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  switch (currentTool) {
    case 'highlight':
      if (!currentAnnotation) {
        // Create new highlight annotation on first move
        const highlightAnnotation = {
          id: generateId(),
          type: 'highlight',
          pageNum: currentPage,
          x: Math.min(startX, x),
          y: Math.min(startY, y),
          width: Math.abs(x - startX),
          height: Math.abs(y - startY),
          color: currentColor
        };
        
        annotations.push(highlightAnnotation);
        currentAnnotation = highlightAnnotation;
      } else {
        // Update highlight dimensions
        currentAnnotation.x = Math.min(startX, x);
        currentAnnotation.y = Math.min(startY, y);
        currentAnnotation.width = Math.abs(x - startX);
        currentAnnotation.height = Math.abs(y - startY);
      }
      break;
      
    case 'draw':
      if (currentAnnotation) {
        // Add point to draw path
        currentAnnotation.points.push({ x, y });
      }
      break;
  }
  
  // Re-render annotations
  renderAnnotations(currentPage);
});

annotationLayer.addEventListener('mouseup', () => {
  isDragging = false;
  
  // For highlight and draw, finalize the annotation
  if ((currentTool === 'highlight' || currentTool === 'draw') && currentAnnotation) {
    // For highlight, check if it's too small
    if (currentTool === 'highlight' && 
        (currentAnnotation.width < 5 || currentAnnotation.height < 5)) {
      // Remove annotations that are too small
      const index = annotations.findIndex(a => a.id === currentAnnotation.id);
      if (index !== -1) {
        annotations.splice(index, 1);
        renderAnnotations(currentPage);
      }
    }
    
    // Reset current annotation
    currentAnnotation = null;
  }
});

// Save button
saveBtn.addEventListener('click', () => {
  // In a real implementation, this would save the PDF with annotations
  alert('Save functionality would be implemented here in a production version.');
});

// Download button
downloadBtn.addEventListener('click', () => {
  // In a real implementation, this would download the PDF with annotations
  alert('Download functionality would be implemented here in a production version.');
});

// Initialize the editor
window.addEventListener('load', initPDF);

// Set cursor as default tool
setActiveTool('cursor');