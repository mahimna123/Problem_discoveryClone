// public/js/controller.js
const Brainstorm = {}; // Placeholder for client-side state

async function initialize() {
  console.log('Initializing...');
  try {
    await loadData();
    const addIdeaButton = document.querySelector('.add-idea-button');
    if (addIdeaButton) {
      console.log('Add Idea button found, attaching event listener');
      addIdeaButton.addEventListener('click', addIdea);
    } else {
      console.error('Add Idea button not found in DOM');
    }
    updateExistingFrameBoxButtons();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

function updateExistingFrameBoxButtons() {
  const frameBoxes = document.querySelectorAll('.frame-box');
  frameBoxes.forEach(frameBox => {
    const button = frameBox.querySelector('.add-more-ideas-button');
    if (button) {
      // Remove any existing listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      // Add event listener
      newButton.addEventListener('click', (e) => {
        e.stopPropagation();
        addIdeaToFrame(frameBox);
      });
    }
  });
  console.log(`Updated ${frameBoxes.length} existing frame box buttons`);
}

async function loadData() {
  console.log('Loading data...');
  try {
    const problemId = document.getElementById('problem-id')?.value;
    if (!problemId) {
      console.error('Problem ID not found');
      return;
    }
    
    const [ideas, frames] = await Promise.all([
      fetch(`/api/ideas?problemId=${problemId}`).then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      }),
      fetch(`/api/frames?problemId=${problemId}`).then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
    ]);
    ideas.forEach(idea => createIdeaElement(idea._id, idea.content, idea.x, idea.y));
    frames.forEach(frame => createFrameBox(frame._id, frame.content, frame.x, frame.y));
    updatePoints(Brainstorm.totalPoints || 0);
    console.log('Data loaded successfully');
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

async function addIdea() {
  console.log('Add Idea button clicked');
  try {
    const problemStatement = document.getElementById('problem-statement');
    const problemRect = problemStatement.getBoundingClientRect();
    const angle = Math.random() * 2 * Math.PI;
    const distance = 200;
    const ideaX = problemRect.left + problemRect.width / 2 + Math.cos(angle) * distance;
    const ideaY = problemRect.top + problemRect.height / 2 + Math.sin(angle) * distance;

    const idea = createIdeaElement(null, `Idea ${document.querySelectorAll('.idea').length + 1}`, ideaX, ideaY);
    document.body.appendChild(idea);
    console.log('Idea element created and appended');

    const problemId = document.getElementById('problem-id')?.value;
    if (!problemId) {
      console.error('Problem ID not found');
      return;
    }
    
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '', x: ideaX, y: ideaY, problemId: problemId })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    console.log('API response:', data);
    idea.dataset.id = data.id;
    idea.id = `element-${data.id}`;
    Brainstorm.totalPoints = data.totalPoints;
    updatePoints(data.totalPoints);
    drawLine(document.getElementById('problem-statement'), idea);
    console.log('Idea added successfully');
  } catch (error) {
    console.error('Error adding idea:', error);
  }
}

function createIdeaElement(id, content, x, y) {
  const idea = document.createElement('div');
  idea.className = 'idea';
  idea.dataset.id = id || '';
  idea.id = id ? `element-${id}` : '';
  idea.innerHTML = `
    <textarea placeholder="${content}"></textarea>
    <button class="delete-button" onclick="deleteIdea(this)">Delete</button>
  `;
  idea.style.left = `${x}px`;
  idea.style.top = `${y}px`;
  makeDraggable(idea);
  return idea;
}

async function deleteIdea(button) {
  const idea = button.parentElement;
  const id = idea.dataset.id;
  try {
    const endpoint = idea.classList.contains('frame-box') ? `/api/frames/${id}` : `/api/ideas/${id}`;
    await fetch(endpoint, { method: 'DELETE' });
    document.querySelectorAll('.line').forEach(line => {
      if (line.dataset.sourceId === idea.id || line.dataset.targetId === idea.id) {
        line.remove();
      }
    });
    document.querySelectorAll('.define-frame-button').forEach(button => {
      if (button.dataset.sourceId === idea.id || button.dataset.targetId === idea.id) {
        button.remove();
      }
    });
    idea.remove();
    const response = await fetch(endpoint, { method: 'DELETE' });
    const data = await response.json();
    Brainstorm.totalPoints = data.totalPoints;
    updatePoints(data.totalPoints);
  } catch (error) {
    console.error('Error deleting idea:', error);
  }
}

function updatePoints(points) {
  document.getElementById('points').textContent = points;
}

function makeDraggable(element) {
  let isDragging = false;
  let offsetX, offsetY;

  element.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      element.style.left = `${e.clientX - offsetX}px`;
      element.style.top = `${e.clientY - offsetY}px`;
      updateLinesForElement(element);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      savePosition(element);
    }
  });
}

async function savePosition(element) {
  const id = element.dataset.id;
  const rect = element.getBoundingClientRect();
  const endpoint = element.classList.contains('frame-box') ? `/api/frames/${id}` : `/api/ideas/${id}`;
  try {
    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: rect.left, y: rect.top })
    });
  } catch (error) {
    console.error('Error saving position:', error);
  }
}

function drawLine(source, target, includeDefineFrameButton = true) {
  console.log('Drawing line from:', source.id, 'to:', target.id);
  console.log('Source element:', source);
  console.log('Target element:', target);
  
  // Ensure source and target have IDs
  if (!source.id) {
    if (source.dataset.id) {
      source.id = `element-${source.dataset.id}`;
    } else {
      source.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  if (!target.id) {
    if (target.dataset.id) {
      target.id = `element-${target.dataset.id}`;
    } else {
      target.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  
  const line = document.createElement('div');
  line.className = 'line';
  line.style.position = 'absolute';
  line.style.zIndex = '5';
  line.dataset.sourceId = source.id;
  line.dataset.targetId = target.id;
  document.body.appendChild(line);
  console.log('Line element created:', line);
  updateLine(source, target, line);
  console.log('Line created and positioned:', {
    left: line.style.left,
    top: line.style.top,
    width: line.style.width,
    transform: line.style.transform,
    element: line
  });

  if (includeDefineFrameButton && !target.classList.contains('frame-box')) {
    const defineFrameButton = document.createElement('button');
    defineFrameButton.className = 'define-frame-button';
    defineFrameButton.textContent = 'Define a Frame';
    defineFrameButton.dataset.sourceId = source.id;
    defineFrameButton.dataset.targetId = target.id;
    defineFrameButton.onclick = () => defineFrame(source, target, line, defineFrameButton);
    document.body.appendChild(defineFrameButton);
    updateButtonPosition(source, target, defineFrameButton);
  }
}

async function defineFrame(source, target, line, defineFrameButton) {
  defineFrameButton.remove();
  const buttonRect = defineFrameButton.getBoundingClientRect();
  const frameBox = createFrameBox(null, 'Frame Box', buttonRect.left, buttonRect.top);
  document.body.appendChild(frameBox);
  line.remove();
  try {
    const problemId = document.getElementById('problem-id')?.value;
    if (!problemId) {
      console.error('Problem ID not found');
      return;
    }
    
    const response = await fetch('/api/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '', x: buttonRect.left, y: buttonRect.top, problemId: problemId })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    frameBox.dataset.id = data.id;
    frameBox.id = `element-${data.id}`;
    Brainstorm.totalPoints = data.totalPoints;
    updatePoints(data.totalPoints);
    drawLine(source, frameBox, false);
    drawLine(frameBox, target, false);
    setTimeout(() => {
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const frameX = (sourceRect.left + targetRect.left) / 2;
      const frameY = (sourceRect.top + targetRect.top) / 2;
      frameBox.style.left = `${frameX}px`;
      frameBox.style.top = `${frameY}px`;
      updateLinesForElement(frameBox);
      savePosition(frameBox);
    }, 0);
  } catch (error) {
    console.error('Error defining frame:', error);
  }
}

function createFrameBox(id, content, x, y) {
  const frameBox = document.createElement('div');
  frameBox.className = 'frame-box';
  frameBox.dataset.id = id || '';
  frameBox.id = id ? `element-${id}` : '';
  frameBox.innerHTML = `
    <textarea placeholder="${content}"></textarea>
    <button class="add-more-ideas-button">Add More Ideas</button>
    <button class="delete-button" onclick="deleteIdea(this)">Delete</button>
  `;
  frameBox.style.left = `${x}px`;
  frameBox.style.top = `${y}px`;
  
  // Attach event listener to the button
  const addButton = frameBox.querySelector('.add-more-ideas-button');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.stopPropagation();
      addIdeaToFrame(frameBox);
    });
  }
  
  makeDraggable(frameBox);
  return frameBox;
}

async function addIdeaToFrame(frameBox) {
  console.log('=== addIdeaToFrame CALLED ===');
  console.log('Frame box:', frameBox);
  console.log('Frame box ID:', frameBox.id);
  console.log('Frame box dataset.id:', frameBox.dataset.id);
  
  // Ensure frameBox has an ID
  if (!frameBox.id && frameBox.dataset.id) {
    frameBox.id = `element-${frameBox.dataset.id}`;
    console.log('Set frameBox.id to:', frameBox.id);
  }
  if (!frameBox.id) {
    console.error('Frame box does not have an ID - cannot create connection');
    alert('Error: Frame box does not have an ID. Please refresh the page.');
    return;
  }
  
  // Get frame position using computed style (document coordinates)
  const frameStyle = window.getComputedStyle(frameBox);
  const frameX = parseFloat(frameStyle.left) || 0;
  const frameY = parseFloat(frameStyle.top) || 0;
  const frameWidth = parseFloat(frameStyle.width) || 120;
  const frameHeight = parseFloat(frameStyle.height) || 120;
  
  console.log('Frame position:', { x: frameX, y: frameY, width: frameWidth, height: frameHeight });
  
  const angle = Math.random() * 2 * Math.PI;
  const distance = 150;
  const ideaX = frameX + frameWidth / 2 + Math.cos(angle) * distance;
  const ideaY = frameY + frameHeight / 2 + Math.sin(angle) * distance;
  
  console.log('Creating idea at:', { x: ideaX, y: ideaY });
  
  const idea = createIdeaElement(null, `Idea ${document.querySelectorAll('.idea').length + 1}`, ideaX, ideaY);
  document.body.appendChild(idea);
  console.log('Idea element created and appended:', idea);
  
  try {
    const problemId = document.getElementById('problem-id')?.value;
    if (!problemId) {
      console.error('Problem ID not found');
      alert('Error: Problem ID not found. Please refresh the page.');
      return;
    }
    
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '', x: ideaX, y: ideaY, problemId: problemId })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    console.log('API response:', data);
    
    idea.dataset.id = data.id;
    idea.id = `element-${data.id}`;
    console.log('Set idea ID to:', idea.id);
    Brainstorm.totalPoints = data.totalPoints;
    updatePoints(data.totalPoints);
    
    // Wait for DOM to fully update, then draw line
    // Use setTimeout to ensure all layout is complete
    setTimeout(() => {
      console.log('=== DRAWING LINE ===');
      console.log('Frame:', { id: frameBox.id, element: frameBox, exists: !!frameBox.parentElement });
      console.log('Idea:', { id: idea.id, element: idea, exists: !!idea.parentElement });
      
      // Verify elements are in DOM
      if (!frameBox.parentElement) {
        console.error('Frame box is not in DOM!');
        return;
      }
      if (!idea.parentElement) {
        console.error('Idea is not in DOM!');
        return;
      }
      
      // Get actual positions
      const frameRect = frameBox.getBoundingClientRect();
      const ideaRect = idea.getBoundingClientRect();
      console.log('Frame rect:', frameRect);
      console.log('Idea rect:', ideaRect);
      
      try {
        drawLine(frameBox, idea, false);
        console.log('Line drawing completed');
        
        // Verify line was created
        setTimeout(() => {
          const lines = document.querySelectorAll('.line');
          console.log('Total lines in DOM:', lines.length);
          const lastLine = lines[lines.length - 1];
          if (lastLine) {
            const lineRect = lastLine.getBoundingClientRect();
            console.log('Last line created:', {
              sourceId: lastLine.dataset.sourceId,
              targetId: lastLine.dataset.targetId,
              styles: {
                left: lastLine.style.left,
                top: lastLine.style.top,
                width: lastLine.style.width,
                transform: lastLine.style.transform,
                position: lastLine.style.position,
                zIndex: lastLine.style.zIndex
              },
              boundingRect: lineRect,
              isVisible: lineRect.width > 0 && lineRect.height > 0
            });
            
            // Force a repaint
            lastLine.style.display = 'none';
            lastLine.offsetHeight; // Trigger reflow
            lastLine.style.display = 'block';
          } else {
            console.error('No line element found in DOM after drawLine call!');
          }
        }, 50);
      } catch (error) {
        console.error('Error in drawLine:', error);
        console.error('Error stack:', error.stack);
      }
    }, 100);
  } catch (error) {
    console.error('Error adding idea to frame:', error);
    alert('Error creating idea: ' + error.message);
  }
}

// Make addIdeaToFrame available globally for onclick handlers
window.addIdeaToFrame = addIdeaToFrame;

function updateLine(source, target, line) {
  console.log('=== updateLine called ===');
  console.log('Source:', source.id, source);
  console.log('Target:', target.id, target);
  console.log('Line element:', line);
  
  // Get actual element positions from their style properties (these are document-relative)
  const sourceStyle = window.getComputedStyle(source);
  const targetStyle = window.getComputedStyle(target);
  
  let sourceX = parseFloat(source.style.left) || parseFloat(sourceStyle.left) || 0;
  let sourceY = parseFloat(source.style.top) || parseFloat(sourceStyle.top) || 0;
  let sourceWidth = parseFloat(sourceStyle.width) || 120;
  let sourceHeight = parseFloat(sourceStyle.height) || 120;
  
  let targetX = parseFloat(target.style.left) || parseFloat(targetStyle.left) || 0;
  let targetY = parseFloat(target.style.top) || parseFloat(targetStyle.top) || 0;
  let targetWidth = parseFloat(targetStyle.width) || 120;
  let targetHeight = parseFloat(targetStyle.height) || 120;
  
  // If computed style values are "auto" or invalid, try getBoundingClientRect
  if (isNaN(sourceX) || isNaN(sourceY) || sourceX === 0 || sourceY === 0) {
    const sourceRect = source.getBoundingClientRect();
    sourceX = sourceRect.left;
    sourceY = sourceRect.top;
    sourceWidth = sourceRect.width;
    sourceHeight = sourceRect.height;
    console.log('Using getBoundingClientRect for source:', { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight });
  }
  
  if (isNaN(targetX) || isNaN(targetY) || targetX === 0 || targetY === 0) {
    const targetRect = target.getBoundingClientRect();
    targetX = targetRect.left;
    targetY = targetRect.top;
    targetWidth = targetRect.width;
    targetHeight = targetRect.height;
    console.log('Using getBoundingClientRect for target:', { x: targetX, y: targetY, width: targetWidth, height: targetHeight });
  }
  
  // Calculate connection points
  // For problem statement box, connect from the bottom center (back of the box)
  // For other elements, connect from center
  let sourceConnectionX, sourceConnectionY;
  let targetConnectionX, targetConnectionY;
  
  // Use getBoundingClientRect for problem statement to get actual rendered position (accounts for transform)
  if (source.id === 'problem-statement' || source.classList.contains('problem-statement')) {
    const sourceRect = source.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    
    // Calculate exact center: midpoint of left/right AND midpoint of top/bottom
    // This ensures perfect centering both horizontally and vertically
    const sourceLeft = sourceRect.left + scrollX;
    const sourceRight = sourceRect.right + scrollX;
    const sourceTop = sourceRect.top + scrollY;
    const sourceBottom = sourceRect.bottom + scrollY;
    
    // Exact center horizontally: average of left and right edges
    sourceConnectionX = (sourceLeft + sourceRight) / 2;
    // Exact center vertically: average of top and bottom edges
    sourceConnectionY = (sourceTop + sourceBottom) / 2;
    
    console.log('Problem statement connection point (exact center):', {
      rect: { 
        left: sourceRect.left, 
        top: sourceRect.top, 
        right: sourceRect.right,
        bottom: sourceRect.bottom,
        width: sourceRect.width, 
        height: sourceRect.height 
      },
      scroll: { x: scrollX, y: scrollY },
      calculated: {
        sourceLeft, sourceRight, sourceTop, sourceBottom,
        centerX: (sourceLeft + sourceRight) / 2,
        centerY: (sourceTop + sourceBottom) / 2
      },
      connection: { x: sourceConnectionX, y: sourceConnectionY }
    });
  } else {
    // Connect from center for other elements
    sourceConnectionX = sourceX + sourceWidth / 2;
    sourceConnectionY = sourceY + sourceHeight / 2;
  }
  
  // Always connect to center of target
  targetConnectionX = targetX + targetWidth / 2;
  targetConnectionY = targetY + targetHeight / 2;
  
  const deltaX = targetConnectionX - sourceConnectionX;
  const deltaY = targetConnectionY - sourceConnectionY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
  console.log('Line calculation:', {
    sourcePos: { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight },
    targetPos: { x: targetX, y: targetY, width: targetWidth, height: targetHeight },
    sourceConnection: { x: sourceConnectionX, y: sourceConnectionY },
    targetConnection: { x: targetConnectionX, y: targetConnectionY },
    distance: distance,
    angle: angle
  });
  
  // Validate distance
  if (distance < 1) {
    console.warn('Distance is too small, line may not be visible');
    return;
  }
  
  // Set ALL line properties explicitly - sleek black line
  line.style.position = 'absolute';
  line.style.left = `${sourceConnectionX}px`;
  line.style.top = `${sourceConnectionY}px`;
  line.style.width = `${distance}px`;
  line.style.height = '2px';
  line.style.backgroundColor = '#000000';
  line.style.transform = `rotate(${angle}deg)`;
  line.style.transformOrigin = '0 0';
  line.style.zIndex = '5';
  line.style.display = 'block';
  line.style.visibility = 'visible';
  line.style.pointerEvents = 'none';
  line.style.borderRadius = '1px';
  line.style.boxShadow = 'none';
  
  console.log('Line styles applied:', {
    position: line.style.position,
    left: line.style.left,
    top: line.style.top,
    width: line.style.width,
    height: line.style.height,
    transform: line.style.transform
  });
  
  // Verify line is in DOM and visible
  if (!document.body.contains(line)) {
    console.error('Line element is not in DOM!');
  } else {
    const lineRect = line.getBoundingClientRect();
    console.log('Line element is in DOM. Bounding rect:', lineRect);
    console.log('Line is visible?', lineRect.width > 0 && lineRect.height > 0);
    if (lineRect.width === 0 || lineRect.height === 0) {
      console.error('Line has zero dimensions!');
    }
  }
}

function updateButtonPosition(source, target, button) {
  // Use the same connection point logic as updateLine
  const sourceStyle = window.getComputedStyle(source);
  const targetStyle = window.getComputedStyle(target);
  
  let sourceX = parseFloat(source.style.left) || parseFloat(sourceStyle.left) || 0;
  let sourceY = parseFloat(source.style.top) || parseFloat(sourceStyle.top) || 0;
  let sourceWidth = parseFloat(sourceStyle.width) || 120;
  let sourceHeight = parseFloat(sourceStyle.height) || 120;
  
  let targetX = parseFloat(target.style.left) || parseFloat(targetStyle.left) || 0;
  let targetY = parseFloat(target.style.top) || parseFloat(targetStyle.top) || 0;
  let targetWidth = parseFloat(targetStyle.width) || 120;
  let targetHeight = parseFloat(targetStyle.height) || 120;
  
  // Calculate connection points (same as updateLine)
  let sourceConnectionX, sourceConnectionY;
  if (source.id === 'problem-statement' || source.classList.contains('problem-statement')) {
    // Use getBoundingClientRect for problem statement to get actual rendered position
    const sourceRect = source.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    
    // Exact center: average of left/right AND top/bottom
    const sourceLeft = sourceRect.left + scrollX;
    const sourceRight = sourceRect.right + scrollX;
    const sourceTop = sourceRect.top + scrollY;
    const sourceBottom = sourceRect.bottom + scrollY;
    sourceConnectionX = (sourceLeft + sourceRight) / 2;
    sourceConnectionY = (sourceTop + sourceBottom) / 2;
  } else {
    sourceConnectionX = sourceX + sourceWidth / 2;
    sourceConnectionY = sourceY + sourceHeight / 2;
  }
  
  const targetConnectionX = targetX + targetWidth / 2;
  const targetConnectionY = targetY + targetHeight / 2;
  
  // Position button at the midpoint of the line
  const midX = (sourceConnectionX + targetConnectionX) / 2 - (button.offsetWidth || 100) / 2;
  const midY = (sourceConnectionY + targetConnectionY) / 2 - (button.offsetHeight || 30) / 2;
  
  button.style.position = 'absolute';
  button.style.left = `${midX}px`;
  button.style.top = `${midY}px`;
}

function updateLinesForElement(element) {
  document.querySelectorAll('.line').forEach(line => {
    const sourceId = line.dataset.sourceId;
    const targetId = line.dataset.targetId;
    if (sourceId === element.id || targetId === element.id) {
      const source = document.getElementById(sourceId);
      const target = document.getElementById(targetId);
      if (source && target) {
        updateLine(source, target, line);
        document.querySelectorAll('.define-frame-button').forEach(button => {
          if (button.dataset.sourceId === sourceId && button.dataset.targetId === targetId) {
            updateButtonPosition(source, target, button);
          }
        });
      }
    }
  });
}

window.addEventListener('load', initialize);