document.addEventListener('DOMContentLoaded', function() {
  const noteArea = document.getElementById('note');
  const saveBtn = document.getElementById('save');

  // Load saved note
  chrome.storage.sync.get(['note'], function(result) {
    noteArea.value = result.note || '';
  });

  // Save note
  saveBtn.addEventListener('click', function() {
    chrome.storage.sync.set({ note: noteArea.value }, function() {
      saveBtn.textContent = 'Saved!';
      setTimeout(() => saveBtn.textContent = 'Save', 1000);
    });
  });
}); 