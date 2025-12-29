function saveBoard() {
    console.log('Saving board...');
  
    // Get the problem statement ID from the hidden input
    const problemId = document.getElementById('problem-id')?.value;
    console.log('=== FRONTEND DEBUG ===');
    console.log('Problem ID from hidden input:', problemId);
    console.log('Problem ID element exists:', !!document.getElementById('problem-id'));
    
    // Check if problemId is missing
    if (!problemId) {
      console.error('Problem ID is missing! Cannot save without a problem context.');
      showSaveError('Error: No problem selected. Please go back to the dashboard and select a problem to ideate on.');
      return;
    }
  
    // Collect all ideas and frames from the DOM
    const ideas = Array.from(document.querySelectorAll('.idea')).map(idea => {
      // Get the value from the textarea inside the idea
      const textarea = idea.querySelector('textarea');
      const content = textarea ? textarea.value.trim() : '';
      const style = window.getComputedStyle(idea);
      const x = parseFloat(style.left) || 0;
      const y = parseFloat(style.top) || 0;
      return {
        id: idea.id,
        content,
        x,
        y,
      };
    });
  
    const frames = Array.from(document.querySelectorAll('.frame-box')).map(frame => {
      // Get the value from the textarea inside the frame
      const textarea = frame.querySelector('textarea');
      const content = textarea ? textarea.value.trim() : '';
      const style = window.getComputedStyle(frame);
      const x = parseFloat(style.left) || 0;
      const y = parseFloat(style.top) || 0;
      return {
        id: frame.id,
        content,
        x,
        y,
      };
    });
  
    // Collect problem statement
    const problemStatementElement = document.getElementById('problem-statement');
    const problemStatement = {
      content: problemStatementElement?.querySelector('.content')?.innerText.trim() ||
               problemStatementElement?.querySelector('textarea')?.value.trim() ||
               problemStatementElement?.querySelector('p')?.innerText.trim() || '',
      problemId: problemId // Use the problem ID from hidden input
    };
    
    console.log('Problem statement object:', problemStatement);
    console.log('Problem statement problemId:', problemStatement.problemId);
  
    // Collect connections (lines between elements)
    const connections = Array.from(document.querySelectorAll('.line'))
      .map(line => {
        const sourceId = line.dataset.sourceId || '';
        const targetId = line.dataset.targetId || '';
        return { sourceId, targetId };
      })
      .filter(conn => conn.sourceId && conn.targetId);
  
    // Collect username
    const usernameElement = document.getElementById('current-username');
    const username = usernameElement ? usernameElement.value : '';
  
    // Prepare the data to save
    const dataToSave = {
      ideas,
      frames,
      problemStatement,
      connections,
      username,
    };
  
    console.log('Collected data:', JSON.stringify(dataToSave, null, 2));
  
    // Log the fetch request details
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin', // Include cookies in the request
      body: JSON.stringify(dataToSave),
    };
    console.log('Fetch request options:', requestOptions);
  
    // Send the data to the server
    fetch('/api/save', requestOptions)
      .then(response => {
        console.log('Fetch response status:', response.status);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required. Please log in again.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Server response:', data);
        showSaveSuccess('Your ideas have been saved successfully!');
      })
      .catch(error => {
        console.error('Error saving board:', error);
        if (error.message.includes('Authentication required')) {
          showSaveError('Session expired. Please refresh the page and log in again.');
        } else {
          showSaveError('Failed to save your ideas. Please try again.');
        }
      });
  }
  
  // Attach the saveBoard function to the save button
  document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
      // Remove any existing listeners by cloning the element
      const newButton = saveButton.cloneNode(true);
      saveButton.parentNode.replaceChild(newButton, saveButton);
      newButton.addEventListener('click', saveBoard);
      console.log('Save button event listener attached');
    } else {
      console.error('Save button not found');
    }
  });