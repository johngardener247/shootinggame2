// Game canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let gamePaused = false;
let score = 0;
let timeLeft = 50;
let lastTime = 0;
let highScore = localStorage.getItem('highScore') || 0;
let shotsFired = 0;
let hits = 0;
let gameStartTime = 0;
let pauseStartTime = 0;
let totalPauseTime = 0;
let speedMultiplier = 1.0; // Track speed multiplier for increasing difficulty

// Game constants
const TARGET_VISIBILITY_TIME = 2000; // Exactly 2 seconds (2000ms)
const TARGET_SPAWN_DELAY = 500;
const GAME_DURATION = 50;
const BASE_TARGET_SPEED = 20.0; // Base speed for targets
const SPEED_INCREASE = 0.2; // How much to increase speed by each time

// Game objects
const target = {
    x: 0,
    y: 0,
    radius: 20,
    visible: false,
    spawnTime: 0,
    velocityX: 0,
    velocityY: 0,
    hit: false
};

const crosshair = {
    x: 0,
    y: 0
};

const explosion = {
    x: 0,
    y: 0,
    radius: 0,
    maxRadius: 40,
    active: false,
    startTime: 0
};

// Assets
const targetImage = new Image();
targetImage.src = '../../assets/target.png';
const crosshairImage = new Image();
crosshairImage.src = '../../assets/crosshair.png';
const explosionImage = new Image();
explosionImage.src = '../../assets/explosion.png';

// Audio
const shotSound = new Audio('../../assets/hit.mp3');
const hitSound = new Audio('../../assets/hit.mp3');

// Initialize game
function init() {
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Add event listeners
    canvas.addEventListener('mousemove', updateCrosshair);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('keydown', handleKeyDown);
    
    // Start game
    startGame();
}

// Resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Handle keyboard input
function handleKeyDown(e) {
    if (e.code === 'Space' && gameRunning) {
        togglePause();
    } else if (e.code === 'KeyR') {
        resetHighScore();
    } else if (e.code === 'KeyP') {
        // Restart game when P key is pressed
        if (!gameRunning) {
            restartGame();
        }
    } else if (e.code === 'KeyS') {
        // Save game when S key is pressed
        if (gameRunning) {
            saveGame();
        }
    } else if (e.code === 'KeyL') {
        // Load game when L key is pressed
        if (!gameRunning) {
            loadGame();
        }
    }
}

// Reset high score
function resetHighScore() {
    highScore = 0;
    localStorage.removeItem('highScore');
    
    // Show confirmation message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('High Score Reset!', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
    
    // Clear the message after 2 seconds
    setTimeout(() => {
        if (!gamePaused) requestAnimationFrame(gameLoop);
    }, 2000);
}

// Toggle pause state
function togglePause() {
    if (gamePaused) {
        // Resume game
        gamePaused = false;
        totalPauseTime += Date.now() - pauseStartTime;
        requestAnimationFrame(gameLoop);
    } else {
        // Pause game
        gamePaused = true;
        pauseStartTime = Date.now();
        drawPauseScreen();
    }
}

// Draw pause screen
function drawPauseScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pause text
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    
    ctx.font = '24px Arial';
    ctx.fillText('Press SPACE to resume', canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = 'left';
}

// Game loop
function gameLoop(timestamp) {
    if (!gameRunning || gamePaused) return;
    
    // Calculate delta time
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update game state
    updateGame(deltaTime);
    
    // Draw game objects
    drawGame();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Update game state
function updateGame(deltaTime) {
    // Update target visibility and position
    if (target.visible) {
        // Move target
        target.x += target.velocityX * (deltaTime / 1000);
        target.y += target.velocityY * (deltaTime / 1000);
        
        // Bounce off walls
        if (target.x - target.radius < 0 || target.x + target.radius > canvas.width) {
            target.velocityX *= -1;
            target.x = Math.max(target.radius, Math.min(canvas.width - target.radius, target.x));
        }
        
        if (target.y - target.radius < 0 || target.y + target.radius > canvas.height) {
            target.velocityY *= -1;
            target.y = Math.max(target.radius, Math.min(canvas.height - target.radius, target.y));
        }
        
        // Check if target should disappear
        if (Date.now() - target.spawnTime > TARGET_VISIBILITY_TIME) {
            target.visible = false;
            setTimeout(spawnTarget, TARGET_SPAWN_DELAY);
        }
    }
    
    // Update explosion
    if (explosion.active) {
        explosion.radius = Math.min(explosion.maxRadius, explosion.radius + deltaTime * 0.05);
        if (explosion.radius >= explosion.maxRadius) explosion.active = false;
    }
    
    // Update timer
    timeLeft -= deltaTime / 1000;
    if (timeLeft <= 0) endGame();
}

// Draw game objects
function drawGame() {
    // Draw target
    if (target.visible) {
        ctx.drawImage(targetImage, 
            target.x - target.radius, 
            target.y - target.radius, 
            target.radius * 2, 
            target.radius * 2
        );
    }
    
    // Draw explosion
    if (explosion.active) {
        ctx.drawImage(explosionImage,
            explosion.x - explosion.radius,
            explosion.y - explosion.radius,
            explosion.radius * 2,
            explosion.radius * 2
        );
    }
    
    // Draw crosshair
    ctx.drawImage(crosshairImage, 
        crosshair.x - 15, 
        crosshair.y - 15, 
        30, 30
    );
    
    // Draw UI
    drawUI();
}

// Start game
function startGame() {
    gameRunning = true;
    gamePaused = false;
    score = 0;
    timeLeft = GAME_DURATION;
    lastTime = performance.now();
    gameStartTime = Date.now();
    shotsFired = 0;
    hits = 0;
    totalPauseTime = 0;
    speedMultiplier = 1.0; // Reset speed multiplier at game start
    spawnTarget();
    requestAnimationFrame(gameLoop);
}

// End game
function endGame() {
    gameRunning = false;
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    
    // Show game over screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 40);
    
    // Show performance stats
    if (shotsFired > 0) {
        const accuracy = Math.round((hits / shotsFired) * 100);
        ctx.fillText(`Accuracy: ${accuracy}%`, canvas.width / 2, canvas.height / 2 + 80);
        ctx.fillText(`Shots Fired: ${shotsFired}`, canvas.width / 2, canvas.height / 2 + 120);
    }
    
    ctx.fillText('Press P to play again', canvas.width / 2, canvas.height / 2 + 160);
    ctx.fillText('Press L to load saved game', canvas.width / 2, canvas.height / 2 + 200);
    ctx.textAlign = 'left';
}

// Restart game
function restartGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    startGame();
}

// Spawn new target
function spawnTarget() {
    // Set random position
    target.x = Math.random() * (canvas.width - 40) + 20;
    target.y = Math.random() * (canvas.height - 40) + 20;
    
    // Set random velocity (direction and speed)
    const angle = Math.random() * Math.PI * 2; // Random angle in radians
    const currentSpeed = BASE_TARGET_SPEED * speedMultiplier; // Apply speed multiplier
    target.velocityX = Math.cos(angle) * currentSpeed;
    target.velocityY = Math.sin(angle) * currentSpeed;
    
    target.visible = true;
    target.hit = false; // Reset hit status
    target.spawnTime = Date.now();
    
    // Increase speed multiplier for next target
    speedMultiplier += SPEED_INCREASE;
}

// Update crosshair position
function updateCrosshair(e) {
    const rect = canvas.getBoundingClientRect();
    crosshair.x = e.clientX - rect.left;
    crosshair.y = e.clientY - rect.top;
}

// Handle touch move
function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    crosshair.x = touch.clientX - rect.left;
    crosshair.y = touch.clientY - rect.top;
}

// Handle touch start
function handleTouchStart(e) {
    e.preventDefault();
    handleClick(e.touches[0]);
}

// Handle click
function handleClick(e) {
    if (!gameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Increment shots fired
    shotsFired++;
    
    // Play shot sound
    shotSound.currentTime = 0;
    shotSound.play();
    
    // Check if hit
    if (target.visible && !target.hit) {
        const distance = Math.sqrt(
            Math.pow(clickX - target.x, 2) + 
            Math.pow(clickY - target.y, 2)
        );
        
        if (distance <= target.radius) {
            // Mark target as hit
            target.hit = true;
            
            // Increment hits
            hits++;
            
            // Play hit sound
            hitSound.currentTime = 0;
            hitSound.play();
            
            // Show explosion
            explosion.x = target.x;
            explosion.y = target.y;
            explosion.radius = 0;
            explosion.active = true;
            explosion.startTime = Date.now();
            
            score++;
            setTimeout(spawnTarget, TARGET_SPAWN_DELAY);
        }
    }
}

// Calculate predicted score
function calculatePredictedScore() {
    if (shotsFired === 0) return 0;
    
    const timeElapsed = GAME_DURATION - timeLeft;
    if (timeElapsed <= 0) return score;
    
    const hitRate = hits / shotsFired;
    const shotsPerSecond = shotsFired / timeElapsed;
    const remainingTime = timeLeft;
    const predictedAdditionalHits = Math.floor(hitRate * shotsPerSecond * remainingTime);
    
    return score + predictedAdditionalHits;
}

// Draw UI elements
function drawUI() {
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 20, 40);
    ctx.fillText(`Time: ${Math.ceil(timeLeft)}`, 20, 70);
    ctx.fillText(`High Score: ${highScore}`, 20, 100);
    
    // Draw performance stats
    if (shotsFired > 0) {
        const accuracy = Math.round((hits / shotsFired) * 100);
        const predictedScore = calculatePredictedScore();
        
        ctx.fillText(`Accuracy: ${accuracy}%`, 20, 130);
        ctx.fillText(`Predicted Score: ${predictedScore}`, 20, 160);
        ctx.fillText(`Speed: ${speedMultiplier.toFixed(1)}x`, 20, 190);
    }
    
    // Draw controls help
    ctx.fillText('S: Save Game', 20, 220);
    
    // Draw pause indicator
    if (gamePaused) {
        ctx.fillText('PAUSED', 20, 250);
    }
}

// Save game state
function saveGame() {
    const gameState = {
        score: score,
        timeLeft: timeLeft,
        shotsFired: shotsFired,
        hits: hits,
        speedMultiplier: speedMultiplier,
        timestamp: Date.now()
    };
    
    localStorage.setItem('savedGame', JSON.stringify(gameState));
    
    // Show save confirmation
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Saved!', canvas.width / 2, canvas.height / 2);
    
    // Reset text alignment
    ctx.textAlign = 'left';
    
    // Clear the message after 2 seconds
    setTimeout(() => {
        if (!gamePaused) {
            requestAnimationFrame(gameLoop);
        }
    }, 2000);
}

// Load game state
function loadGame() {
    const savedGame = localStorage.getItem('savedGame');
    
    if (savedGame) {
        const gameState = JSON.parse(savedGame);
        
        // Check if save is not too old (24 hours)
        const now = Date.now();
        const saveAge = now - gameState.timestamp;
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (saveAge < oneDay) {
            // Restore game state
            score = gameState.score;
            timeLeft = gameState.timeLeft;
            shotsFired = gameState.shotsFired;
            hits = gameState.hits;
            speedMultiplier = gameState.speedMultiplier;
            
            // Start game with loaded state
            gameRunning = true;
            gamePaused = false;
            lastTime = performance.now();
            spawnTarget();
            requestAnimationFrame(gameLoop);
        } else {
            // Save is too old
            showMessage('Save file expired. Starting new game.');
            restartGame();
        }
    } else {
        // No save file found
        showMessage('No save file found. Starting new game.');
        restartGame();
    }
}

// Show message on screen
function showMessage(message) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Reset text alignment
    ctx.textAlign = 'left';
    
    // Clear the message after 2 seconds
    setTimeout(() => {
        if (!gamePaused) {
            requestAnimationFrame(gameLoop);
        }
    }, 2000);
}

// Start game when page loads
window.addEventListener('load', init); 