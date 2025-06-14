// Function to check if current page is a PDF
function isPDF() {
  return document.contentType === 'application/pdf' || 
         window.location.href.toLowerCase().endsWith('.pdf');
}

// Function to inject our editor UI overlay
function injectEditorUI() {
  // Create toolbar container
  const toolbar = document.createElement('div');
  toolbar.id = 'pdf-editor-toolbar';
  toolbar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    background-color: #f0f0f0;
    display: flex;
    align-items: center;
    padding: 0 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 9999;
  `;

  // Add editor button
  const editButton = document.createElement('button');
  editButton.textContent = 'Edit with PDF Editor';
  editButton.style.cssText = `
    padding: 8px 12px;
    background-color: #0078d4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  `;
  
  editButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'openEditor',
      pdfUrl: window.location.href
    });
  });
  
  toolbar.appendChild(editButton);
  document.body.insertBefore(toolbar, document.body.firstChild);
  
  // Adjust body padding to account for toolbar
  document.body.style.paddingTop = '50px';
}

// Check if current page is PDF and inject our UI if it is
if (isPDF()) {
  // Small delay to ensure the page is fully loaded
  setTimeout(injectEditorUI, 500);
}