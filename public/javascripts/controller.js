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
      button.onclick = () => addIdeaToFrame(frameBox);
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
  
  const line = document.createElement('div');
  line.className = 'line';
  if (!source.id) source.id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  if (!target.id) target.id = `element-${target.dataset.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  line.dataset.sourceId = source.id;
  line.dataset.targetId = target.id;
  document.body.appendChild(line);
  console.log('Line element created:', line);
  updateLine(source, target, line);
  console.log('Line created and positioned:', line.style.left, line.style.top, line.style.width, line.style.transform);

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
    <button class="add-more-ideas-button" onclick="addIdeaToFrame(this.parentElement)">Add More Ideas</button>
    <button class="delete-button" onclick="deleteIdea(this)">Delete</button>
  `;
  frameBox.style.left = `${x}px`;
  frameBox.style.top = `${y}px`;
  makeDraggable(frameBox);
  return frameBox;
}

// Make function globally accessible
window.addIdeaToFrame = addIdeaToFrame;

async function addIdeaToFrame(frameBox) {
  const frameRect = frameBox.getBoundingClientRect();
  const angle = Math.random() * 2 * Math.PI;
  const distance = 150;
  const ideaX = frameRect.left + frameRect.width / 2 + Math.cos(angle) * distance;
  const ideaY = frameRect.top + frameRect.height / 2 + Math.sin(angle) * distance;
  const idea = createIdeaElement(null, `Idea ${document.querySelectorAll('.idea').length + 1}`, ideaX, ideaY);
  document.body.appendChild(idea);
  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '', x: ideaX, y: ideaY })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    idea.dataset.id = data.id;
    idea.id = `element-${data.id}`;
    Brainstorm.totalPoints = data.totalPoints;
    updatePoints(data.totalPoints);
    
    // Draw line exactly like defineFrame does - simple and direct
    drawLine(frameBox, idea, false);
  } catch (error) {
    console.error('Error adding idea to frame:', error);
  }
}

function updateLine(source, target, line) {
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const deltaX = targetCenterX - sourceCenterX;
  const deltaY = targetCenterY - sourceCenterY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
  console.log('Updating line:', {
    source: source.id,
    target: target.id,
    sourceCenter: { x: sourceCenterX, y: sourceCenterY },
    targetCenter: { x: targetCenterX, y: targetCenterY },
    distance: distance,
    angle: angle
  });
  
  line.style.width = `${distance}px`;
  line.style.left = `${sourceCenterX}px`;
  line.style.top = `${sourceCenterY}px`;
  line.style.transform = `rotate(${angle}deg)`;
}

function updateButtonPosition(source, target, button) {
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const midX = (sourceCenterX + targetCenterX) / 2 - button.offsetWidth / 2;
  const midY = (sourceCenterY + targetCenterY) / 2 - button.offsetHeight / 2;
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