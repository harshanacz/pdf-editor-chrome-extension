document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const editCurrentPdfBtn = document.getElementById('editCurrentPdf');
  const openPdfBtn = document.getElementById('openPdf');
  const recentList = document.getElementById('recentList');
  
  // Edit current PDF button
  editCurrentPdfBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const currentTab = tabs[0];
      
      if (currentTab.url.toLowerCase().endsWith('.pdf')) {
        chrome.runtime.sendMessage({
          action: 'openEditor',
          pdfUrl: currentTab.url
        });
      } else {
        alert('The current page is not a PDF file.');
      }
    });
  });
  
  // Open PDF button
  openPdfBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const fileURL = URL.createObjectURL(file);
        chrome.tabs.create({
          url: chrome.runtime.getURL('editor/editor.html') + 
               '?pdf=' + encodeURIComponent(fileURL) +
               '&filename=' + encodeURIComponent(file.name)
        });
        
        // Save to recent files
        saveToRecentFiles({
          name: file.name,
          type: 'local',
          timestamp: Date.now()
        });
      }
    };
    
    input.click();
  });
  
  // Load recent files
  loadRecentFiles();
  
  // Function to save recent files
  function saveToRecentFiles(fileInfo) {
    chrome.storage.local.get('recentFiles', (data) => {
      let recentFiles = data.recentFiles || [];
      
      // Add new file at beginning
      recentFiles.unshift(fileInfo);
      
      // Limit to 5 recent files
      recentFiles = recentFiles.slice(0, 5);
      
      chrome.storage.local.set({recentFiles});
      
      // Refresh the list
      loadRecentFiles();
    });
  }
  
  // Function to load recent files
  function loadRecentFiles() {
    chrome.storage.local.get('recentFiles', (data) => {
      const recentFiles = data.recentFiles || [];
      
      if (recentFiles.length === 0) {
        recentList.innerHTML = '<li class="no-files">No recent files</li>';
        return;
      }
      
      recentList.innerHTML = '';
      
      recentFiles.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.name;
        li.setAttribute('title', file.name);
        
        li.addEventListener('click', () => {
          if (file.type === 'local') {
            // For local files, we can't reuse the old URL
            alert('Please reopen the file using the Open PDF button.');
          } else if (file.type === 'url') {
            chrome.tabs.create({
              url: chrome.runtime.getURL('editor/editor.html') + 
                   '?pdf=' + encodeURIComponent(file.url)
            });
          }
        });
        
        recentList.appendChild(li);
      });
    });
  }
});