document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    createWaveBars();
    createOrbitalParticles();
});

// Timer variables
let timerInterval = null;
let startTime = null;

function startTimer() {
    const timerDisplay = document.querySelector('.timer-display');
    timerDisplay.classList.add('timer-active');
    startTime = Date.now();
    
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('minutes').textContent = '00';
    document.getElementById('seconds').textContent = '00';
    document.querySelector('.timer-display').classList.remove('timer-active');
}

async function activateAssistant() {
    const overlay = document.querySelector('.activation-overlay');
    const responseText = document.querySelector('.response-text');
    
    overlay.style.display = 'flex';
    responseText.textContent = "Listening...";
    startTimer();

    try {
        const query = await eel.take_command()();
        
        if(query) {
            responseText.textContent = "Processing...";
            const response = await eel.get_response(query)();
            responseText.textContent = response;
            await eel.speak_response(response)();
        } else {
            responseText.textContent = "No query detected";
        }
    } catch(error) {
        responseText.textContent = "Error processing request";
        console.error('Error:', error);
    }
    
    setTimeout(() => {
        overlay.style.display = 'none';
        responseText.textContent = "Hello, I am Aalif";
        resetTimer();
    }, 3000);
}

// Existing particle creation functions
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