document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    createWaveBars();
    createOrbitalParticles();
    setupEventListeners();
    updateChatDisplay();
    initPinSettings();
    initDrawingSystem();
    initAnimatedBackground();
    
    // Hide drawing page by default
    document.getElementById('drawing-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    
    if (localStorage.getItem('darkMode') === 'on') {
        document.body.classList.add('light-mode');
    }
});

// System Constants
const MAX_HISTORY_ITEMS = 100;
const STORAGE_KEY = 'xyrix_chat_history';
const LISTENING_TIMEOUT = 20000;
const MAX_API_RETRIES = 2;

// System Variables
let timerInterval = null;
let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let enteredPin = '';
let pinLockout = false;
let pinAttempts = 0;
let pendingAction = null;
let pinSessionActive = false;
let listeningSession = false;
let listeningTimeout = null;
let continuousMode = false;

// Drawing System Variables
let isDrawing = false;
let currentColor = '#00f3ff';
let brushSize = 5;
let canvas, ctx;
let lastX = 0;
let lastY = 0;
let drawingMode = false;

// Initialize animated background
function initAnimatedBackground() {
    const circuitContainer = document.querySelector('.ai-circuit');
    for (let i = 0; i < 20; i++) {
        const circuitPath = document.createElement('div');
        circuitPath.className = 'circuit-path';
        circuitPath.style.left = `${Math.random() * 100}%`;
        circuitPath.style.top = `${Math.random() * 100}%`;
        circuitPath.style.width = `${Math.random() * 200 + 100}px`;
        circuitPath.style.height = `${Math.random() * 3 + 1}px`;
        circuitPath.style.transform = `rotate(${Math.random() * 360}deg)`;
        circuitPath.style.animationDelay = `${Math.random() * 5}s`;
        circuitContainer.appendChild(circuitPath);
    }
    
    for (let i = 0; i < 15; i++) {
        const node = document.createElement('div');
        node.className = 'circuit-node';
        node.style.left = `${Math.random() * 100}%`;
        node.style.top = `${Math.random() * 100}%`;
        node.style.width = `${Math.random() * 10 + 5}px`;
        node.style.height = node.style.width;
        node.style.animationDelay = `${Math.random() * 5}s`;
        circuitContainer.appendChild(node);
    }
}

// PIN Security System
function initPinSettings() {
    if (!localStorage.getItem('pinEnabled')) {
        localStorage.setItem('pinEnabled', 'false');
    }
    
    if (!localStorage.getItem('pinCode')) {
        localStorage.setItem('pinCode', '1234');
    }
}

function startPinSession() {
    pinSessionActive = true;
    console.log("PIN session started");
}

function endPinSession() {
    pinSessionActive = false;
    continuousMode = false;
    listeningSession = false;
    clearListeningTimeout();
    document.querySelector('.activation-overlay').style.display = 'none';
    document.querySelector('.timer-display').classList.remove('timer-active');
    resetTimerDisplay();
    updateAIResponse("Hello, I am Xyrix");
    console.log("PIN session ended");
}

function checkPinBeforeAction(actionType) {
    if (pinSessionActive) {
        if (actionType === 'voice') {
            startContinuousListening();
        } else {
            handleTextCommand();
        }
        return;
    }

    const pinEnabled = localStorage.getItem('pinEnabled') === 'true';
    pendingAction = actionType;
    
    if (pinEnabled) {
        document.querySelector('.pin-overlay').style.display = 'flex';
        document.getElementById('pinDisplay').textContent = '••••';
        enteredPin = '';
        document.getElementById('pinError').textContent = '';
        pinLockout = false;
        pinAttempts = 0;
    } else {
        startPinSession();
        if (actionType === 'voice') {
            startContinuousListening();
        } else {
            handleTextCommand();
        }
    }
}

function addPinDigit(digit) {
    if (pinLockout) return;
    
    if (enteredPin.length < 4) {
        enteredPin += digit;
        updatePinDisplay();
    }
}

function clearPin() {
    enteredPin = '';
    updatePinDisplay();
    document.getElementById('pinError').textContent = '';
}

function updatePinDisplay() {
    const display = document.getElementById('pinDisplay');
    let displayText = '';
    
    for (let i = 0; i < 4; i++) {
        if (i < enteredPin.length) {
            displayText += '•';
        } else {
            displayText += ' ';
        }
    }
    
    display.textContent = displayText;
}

function submitPin() {
    if (pinLockout) return;
    
    const storedPin = localStorage.getItem('pinCode');
    
    if (enteredPin.length !== 4) {
        document.getElementById('pinError').textContent = 'PIN must be 4 digits';
        return;
    }
    
    if (enteredPin === storedPin) {
        pinAttempts = 0;
        document.querySelector('.pin-overlay').style.display = 'none';
        startPinSession();
        
        if (pendingAction === 'voice') {
            startContinuousListening();
        } else if (pendingAction === 'text') {
            handleTextCommand();
        }
    } else {
        pinAttempts++;
        document.getElementById('pinError').textContent = `Incorrect PIN (${pinAttempts}/3)`;
        enteredPin = '';
        updatePinDisplay();
        
        if (pinAttempts >= 3) {
            pinLockout = true;
            document.getElementById('pinError').textContent = 'Too many attempts. Try again in 30 seconds.';
            setTimeout(() => {
                pinLockout = false;
                pinAttempts = 0;
                document.getElementById('pinError').textContent = '';
            }, 30000);
        }
    }
}

// PIN Settings Functions
function showPinSettings() {
    document.querySelector('.pin-modal').style.display = 'flex';
    document.getElementById('newPin').value = '';
    document.getElementById('confirmPin').value = '';
    document.getElementById('pinEnabled').checked = localStorage.getItem('pinEnabled') === 'true';
    hideSettings();
}

function closePinSettings() {
    document.querySelector('.pin-modal').style.display = 'none';
}

function savePinSettings() {
    const newPin = document.getElementById('newPin').value;
    const confirmPin = document.getElementById('confirmPin').value;
    const pinEnabled = document.getElementById('pinEnabled').checked;
    
    if (pinEnabled && newPin && newPin.length !== 4) {
        alert('PIN must be exactly 4 digits');
        return;
    }
    
    if (pinEnabled && newPin !== confirmPin) {
        alert('PINs do not match');
        return;
    }
    
    if (pinEnabled) {
        localStorage.setItem('pinCode', newPin);
    }
    
    localStorage.setItem('pinEnabled', pinEnabled.toString());
    alert('PIN settings saved successfully');
    closePinSettings();
}

// Drawing System Functions
function initDrawingSystem() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas to full window size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners for freehand drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function startDrawing(e) {
    if (!drawingMode) return;
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
}

function draw(e) {
    if (!isDrawing || !drawingMode) return;
    
    const [x, y] = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    [lastX, lastY] = [x, y];
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouchStart(e) {
    if (!drawingMode) return;
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    if (!drawingMode) return;
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function getCoordinates(e) {
    let x, y;
    if (e.type.includes('touch')) {
        const touch = e.touches[0];
        x = touch.clientX;
        y = touch.clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }
    return [x, y];
}

// Drawing Controls
function setDrawingColor(color) {
    currentColor = color;
}

function setBrushSize(size) {
    brushSize = size;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function toggleDrawingMode() {
    drawingMode = !drawingMode;
    const toggleBtn = document.querySelector('.action-btn.toggle');
    if (drawingMode) {
        toggleBtn.classList.add('active');
    } else {
        toggleBtn.classList.remove('active');
    }
}

function drawShape(shape) {
    if (!drawingMode) toggleDrawingMode();
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.3;
    
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    
    switch(shape) {
        case 'circle':
            ctx.arc(centerX, centerY, size/2, 0, Math.PI * 2);
            break;
        case 'rectangle':
            ctx.rect(centerX - size/2, centerY - size/2, size, size);
            break;
        case 'triangle':
            ctx.moveTo(centerX, centerY - size/2);
            ctx.lineTo(centerX + size/2, centerY + size/2);
            ctx.lineTo(centerX - size/2, centerY + size/2);
            ctx.closePath();
            break;
    }
    
    ctx.stroke();
}

function openDrawingPage() {
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('drawing-page').style.display = 'flex';
    hideSettings();
    clearCanvas();
}

function closeDrawingPage() {
    document.getElementById('drawing-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    drawingMode = false;
    updateAIResponse("Returned to main interface");
}

// WhatsApp Helper Function
function extractWhatsAppCommand(query) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('send whatsapp message to')) {
        const parts = query.split('send whatsapp message to');
        if (parts.length > 1) {
            const contactMessage = parts[1].split('saying');
            if (contactMessage.length > 1) {
                return {
                    type: 'whatsapp_message',
                    contact: contactMessage[0].trim(),
                    message: contactMessage[1].trim()
                };
            }
        }
    }
    else if (lowerQuery.includes('call') && lowerQuery.includes('on whatsapp')) {
        const contactPart = query.split('call')[1];
        if (contactPart) {
            const contact = contactPart.split('on whatsapp')[0].trim();
            return {
                type: 'whatsapp_call',
                contact: contact
            };
        }
    }
    return null;
}

// Core Functionality
function updateAIResponse(text) {
    const responseElement = document.getElementById('aiResponse');
    responseElement.textContent = text;
    
    const container = responseElement.parentElement;
    container.scrollTop = container.scrollHeight;
}

async function startContinuousListening() {
    if (!pinSessionActive) return;
    
    const overlay = document.querySelector('.activation-overlay');
    const timerDisplay = document.querySelector('.timer-display');
    
    overlay.style.display = 'flex';
    updateAIResponse("Listening...");
    timerDisplay.classList.add('timer-active');
    
    continuousMode = true;
    listeningSession = true;
    takeCommandAndProcess();
}

async function takeCommandAndProcess() {
    if (!listeningSession) return;

    try {
        startTimer();
        clearListeningTimeout();
        
        const query = await eel.take_command()();
        
        if(query) {
            // Check for drawing command
            if (query.toLowerCase().includes('draw') || query.toLowerCase().includes('sketch')) {
                const shape = extractDrawingShape(query);
                if (shape) {
                    updateAIResponse(`Opening drawing canvas to draw a ${shape}`);
                    setTimeout(() => {
                        openDrawingPage();
                        setTimeout(() => drawShape(shape), 500);
                    }, 1000);
                } else {
                    updateAIResponse("What shape would you like me to draw? I can draw circles, rectangles, or triangles.");
                }
                return;
            }
            
            // Check for WhatsApp command
            const whatsappCmd = extractWhatsAppCommand(query);
            if (whatsappCmd) {
                updateAIResponse("Processing WhatsApp command...");
                let response;
                if (whatsappCmd.type === 'whatsapp_message') {
                    response = await eel.send_whatsapp_message(whatsappCmd.contact, whatsappCmd.message)();
                } else if (whatsappCmd.type === 'whatsapp_call') {
                    response = await eel.call_whatsapp_contact(whatsappCmd.contact)();
                }
                updateAIResponse(response);
                addToChatHistory(query, response);
                await eel.speak_response(response)();
            } else {
                updateAIResponse("Processing...");
                const response = await eel.get_response(query)();
                updateAIResponse(response);
                await eel.speak_response(response)();
                addToChatHistory(query, response);
            }
            
            resetListeningTimeout();
            
            if (listeningSession) {
                updateAIResponse("Listening for next command...");
                setTimeout(takeCommandAndProcess, 100);
            }
        } else {
            if (listeningSession) {
                updateAIResponse("Listening for next command...");
                setTimeout(takeCommandAndProcess, 100);
            }
        }
    } catch(error) {
        console.error('Error during continuous listen:', error);
        if (listeningSession) {
            updateAIResponse("Temporarily unavailable. Trying to reconnect...");
            setTimeout(() => takeCommandAndProcess(), 3000);
        }
    }
}

function extractDrawingShape(query) {
    query = query.toLowerCase();
    if (query.includes('circle')) return 'circle';
    if (query.includes('rectangle') || query.includes('square')) return 'rectangle';
    if (query.includes('triangle')) return 'triangle';
    return null;
}

function resetListeningTimeout() {
    clearListeningTimeout();
    
    if (continuousMode && listeningSession) {
        listeningTimeout = setTimeout(() => {
            if (continuousMode && listeningSession) {
                console.log("Inactivity timeout triggered");
                updateAIResponse("Session ended due to inactivity");
                setTimeout(() => {
                    endPinSession();
                }, 2000);
            }
        }, LISTENING_TIMEOUT);
    }
}

function clearListeningTimeout() {
    if (listeningTimeout) {
        clearTimeout(listeningTimeout);
        listeningTimeout = null;
    }
}

function resetTimerDisplay() {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('minutes').textContent = '00';
    document.getElementById('seconds').textContent = '00';
}

async function handleTextCommand() {
    const input = document.querySelector('.command-input');
    const command = input.value.trim();
    if (!command) return;

    const overlay = document.querySelector('.activation-overlay');
    const timerDisplay = document.querySelector('.timer-display');

    overlay.style.display = 'flex';
    updateAIResponse("Processing...");
    timerDisplay.classList.add('timer-active');
    input.value = '';
    startTimer();

    try {
        // Check for drawing command
        if (command.toLowerCase().includes('draw') || command.toLowerCase().includes('sketch')) {
            const shape = extractDrawingShape(command);
            if (shape) {
                updateAIResponse(`Opening drawing canvas to draw a ${shape}`);
                setTimeout(() => {
                    openDrawingPage();
                    setTimeout(() => drawShape(shape), 500);
                }, 1000);
            } else {
                updateAIResponse("What shape would you like me to draw? I can draw circles, rectangles, or triangles.");
            }
            return;
        }
        
        // Check for WhatsApp command
        const whatsappCmd = extractWhatsAppCommand(command);
        if (whatsappCmd) {
            let response;
            if (whatsappCmd.type === 'whatsapp_message') {
                response = await eel.send_whatsapp_message(whatsappCmd.contact, whatsappCmd.message)();
            } else if (whatsappCmd.type === 'whatsapp_call') {
                response = await eel.call_whatsapp_contact(whatsappCmd.contact)();
            }
            updateAIResponse(response);
            addToChatHistory(command, response);
            await eel.speak_response(response)();
        } else {
            const response = await eel.get_response(command)();
            updateAIResponse(response);
            await eel.speak_response(response)();
            addToChatHistory(command, response);
        }
    } catch(error) {
        updateAIResponse("Error processing request");
        console.error('Error:', error);
    }
    
    setTimeout(() => {
        overlay.style.display = 'none';
        updateAIResponse("Hello, I am Xyrix");
        timerDisplay.classList.remove('timer-active');
        clearInterval(timerInterval);
    }, 3000);
}

// Chat History System
function toggleChatHistory() {
    document.querySelector('.chat-history-panel').classList.toggle('active');
}

function clearChatHistory() {
    if (confirm('Are you sure you want to delete all chat history?')) {
        localStorage.removeItem(STORAGE_KEY);
        chatHistory = [];
        updateChatDisplay();
    }
}

function addToChatHistory(command, response) {
    const timestamp = new Date().toLocaleString();
    
    chatHistory.push({
        command: command.trim(),
        response: response.trim(),
        timestamp
    });

    if (chatHistory.length > MAX_HISTORY_ITEMS) {
        chatHistory = chatHistory.slice(-MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    updateChatDisplay();
}

function updateChatDisplay() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    if (chatHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                No chat history available
            </div>
        `;
        return;
    }

    try {
        chatHistory.forEach(entry => {
            if (!entry.command || !entry.response) return;

            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message-container';

            messageDiv.innerHTML += `
                <div class="user-message chat-message">
                    <div class="message-time">You • ${entry.timestamp}</div>
                    <div class="message-content">${entry.command}</div>
                </div>
                <div class="bot-message chat-message">
                    <div class="message-time">Xyrix • ${entry.timestamp}</div>
                    <div class="message-content">${entry.response}</div>
                </div>
            `;

            container.appendChild(messageDiv);
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
        localStorage.removeItem(STORAGE_KEY);
        chatHistory = [];
    }

    container.scrollTop = container.scrollHeight;
}

// Settings Panel Functions
function showSettings() {
    document.querySelector('.settings-panel').classList.add('active');
}

function hideSettings() {
    document.querySelector('.settings-panel').classList.remove('active');
}

function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('light-mode') ? 'on' : 'off');
}

// Utility Functions
function startTimer() {
    let seconds = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        document.getElementById('seconds').textContent = 
            String(seconds % 60).padStart(2, '0');
        document.getElementById('minutes').textContent = 
            String(Math.floor(seconds / 60)).padStart(2, '0');
    }, 1000);
}

function setupEventListeners() {
    const input = document.querySelector('.command-input');
    const sendBtn = document.querySelector('.send-btn');
    const micBtn = document.querySelector('.mic-btn');
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkPinBeforeAction('text');
        }
    });
    
    sendBtn.addEventListener('click', () => {
        checkPinBeforeAction('text');
    });
    
    micBtn.addEventListener('click', () => {
        checkPinBeforeAction('voice');
    });
    
    // Add hover effects to all icon buttons
    const iconButtons = document.querySelectorAll('.icon-btn');
    iconButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.classList.add('hover-effect');
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.classList.remove('hover-effect');
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && continuousMode) {
            updateAIResponse("Session ended by user");
            setTimeout(() => {
                endPinSession();
            }, 1000);
        }
    });
}

// Particle Animations
function createParticles() {
    const container = document.querySelector('.particle-container');
    for(let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.className = 'quantum-particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${10 + Math.random() * 20}s`;
        container.appendChild(particle);
    }
}

function createOrbitalParticles() {
    const container = document.querySelector('.orbital-particles');
    for(let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'orbital-particle';
        particle.style.animationDelay = `${Math.random() * 15}s`;
        container.appendChild(particle);
    }
}

function createWaveBars() {
    const waveContainer = document.querySelector('.wave-container');
    for(let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.left = `${i * 5}%`;
        bar.style.animationDelay = `${i * 0.1}s`;
        waveContainer.appendChild(bar);
    }
}