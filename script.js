class Reactor {
    constructor() {
        this.reset();
        this.highScore = parseInt(localStorage.getItem('reactorHighScore')) || 0;
    }

    reset() {
        this.rodPosition = 50;      // 0 = fully inserted, 100 = fully withdrawn
        this.power = 50.0;          // Power level percentage
        this.powerVelocity = 0;     // Rate of change of power
        this.temperature = 400.0;   // Temperature in Celsius
        this.points = 0;
        this.timeRunning = 0;
        this.isCritical = false;
        this.isStalled = false;
        this.isShutdown = false;
    }

    update(dt) {
        if (this.isShutdown || this.isCritical || this.isStalled) {
            return;
        }

        // Rod position controls acceleration of power velocity
        // Center (50) = no acceleration, above = positive accel, below = negative accel
        const acceleration = (this.rodPosition - 50) * 0.4;

        // Apply acceleration to velocity
        this.powerVelocity += acceleration * dt;

        // Gravity pulls rods down constantly
        this.rodPosition -= 10 * dt;

        // Very low drag - momentum carries hard
        this.powerVelocity *= 0.995;

        // Apply velocity to power (higher multiplier = more responsive to velocity)
        this.power += this.powerVelocity * 2.5 * dt;
        this.power = Math.max(0, Math.min(150, this.power));

        // Temperature based on power with some lag
        const targetTemp = 300 + (this.power * 7);
        let tempChange = (targetTemp - this.temperature) * 0.5 * dt;

        // Temperature drops faster when power is low (cooling dominates)
        if (this.power < 20) {
            tempChange -= (20 - this.power) * 0.5 * dt;
        }

        this.temperature += tempChange;
        this.temperature = Math.max(300, this.temperature);

        // Check critical conditions
        if (this.temperature >= 1000) {
            this.isCritical = true;
            return;
        }

        if (this.temperature <= 300 && this.timeRunning > 2) {
            this.isStalled = true;
            return;
        }

        // Accumulate points - exponentially more the closer to meltdown
        if (this.temperature > 300) {
            const tempRatio = (this.temperature - 300) / 700; // 0 at 300°C, 1 at 1000°C
            const multiplier = Math.pow(tempRatio, 3) * 100; // Cubic scaling
            this.points += multiplier * dt * 10;
        }

        this.timeRunning += dt;
    }

    moveRods(direction) {
        if (this.isShutdown) return;
        this.rodPosition += direction * 0.25;
        this.rodPosition = Math.max(0, Math.min(100, this.rodPosition));
    }

    emergencyShutdown() {
        this.isShutdown = true;
        this.rodPosition = 0;
        this.powerVelocity = 0;
    }
}

class Game {
    constructor() {
        this.reactor = new Reactor();
        this.lastTime = performance.now();
        this.gameOver = false;
        this.keysPressed = {};

        this.initElements();
        this.initControls();
        this.updateHighScoreDisplay();
        this.gameLoop();
    }

    initElements() {
        this.elements = {
            controlRods: document.getElementById('controlRods'),
            coreGlow: document.getElementById('coreGlow'),
            powerBar: document.getElementById('powerBar'),
            tempBar: document.getElementById('tempBar'),
            velocityBar: document.getElementById('velocityBar'),
            powerValue: document.getElementById('powerValue'),
            tempValue: document.getElementById('tempValue'),
            velocityValue: document.getElementById('velocityValue'),
            rodPosValue: document.getElementById('rodPosValue'),
            statusDisplay: document.getElementById('statusDisplay'),
            points: document.getElementById('points'),
            time: document.getElementById('time'),
            highScore: document.getElementById('highScore'),
            gameOverOverlay: document.getElementById('gameOverOverlay'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverMessage: document.getElementById('gameOverMessage'),
            finalScore: document.getElementById('finalScore'),
            rodsUp: document.getElementById('rodsUp'),
            rodsDown: document.getElementById('rodsDown'),
            az5Button: document.getElementById('az5Button'),
            restartBtn: document.getElementById('restartBtn')
        };
    }

    initControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keysPressed[e.key.toLowerCase()] = true;

            if (e.key === ' ' && !this.gameOver) {
                e.preventDefault();
                this.triggerAZ5();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keysPressed[e.key.toLowerCase()] = false;
        });

        // Button controls
        this.elements.rodsUp.addEventListener('mousedown', () => this.keysPressed['w'] = true);
        this.elements.rodsUp.addEventListener('mouseup', () => this.keysPressed['w'] = false);
        this.elements.rodsUp.addEventListener('mouseleave', () => this.keysPressed['w'] = false);

        this.elements.rodsDown.addEventListener('mousedown', () => this.keysPressed['s'] = true);
        this.elements.rodsDown.addEventListener('mouseup', () => this.keysPressed['s'] = false);
        this.elements.rodsDown.addEventListener('mouseleave', () => this.keysPressed['s'] = false);

        // Touch controls
        this.elements.rodsUp.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keysPressed['w'] = true;
        });
        this.elements.rodsUp.addEventListener('touchend', () => this.keysPressed['w'] = false);

        this.elements.rodsDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keysPressed['s'] = true;
        });
        this.elements.rodsDown.addEventListener('touchend', () => this.keysPressed['s'] = false);

        this.elements.az5Button.addEventListener('click', () => this.triggerAZ5());
        this.elements.restartBtn.addEventListener('click', () => this.restart());
    }

    triggerAZ5() {
        if (this.gameOver) return;

        this.reactor.emergencyShutdown();
        this.gameOver = true;

        const finalScore = Math.floor(this.reactor.points);
        if (finalScore > this.reactor.highScore) {
            this.reactor.highScore = finalScore;
            localStorage.setItem('reactorHighScore', finalScore);
        }

        this.showGameOver(true, 'SAFE SHUTDOWN', finalScore);
    }

    showGameOver(success, message, score) {
        this.elements.gameOverOverlay.classList.add('active');
        this.elements.gameOverTitle.textContent = success ? 'SHUTDOWN COMPLETE' : 'MELTDOWN';
        this.elements.gameOverTitle.className = success ? 'success' : 'failure';
        this.elements.gameOverMessage.textContent = message;
        this.elements.finalScore.textContent = success ? `Points Banked: ${score}` : 'You lost all your points';
        this.updateHighScoreDisplay();
    }

    restart() {
        this.reactor.reset();
        this.gameOver = false;
        this.lastTime = performance.now();
        this.elements.gameOverOverlay.classList.remove('active');
    }

    updateHighScoreDisplay() {
        this.elements.highScore.textContent = this.reactor.highScore;
    }

    handleInput(dt) {
        if (this.keysPressed['w'] || this.keysPressed['arrowup']) {
            this.reactor.moveRods(1);
        }
        if (this.keysPressed['s'] || this.keysPressed['arrowdown']) {
            this.reactor.moveRods(-1);
        }
    }

    updateDisplay() {
        const r = this.reactor;

        // Update rod position visual
        const rods = this.elements.controlRods.querySelectorAll('.rod');
        const rodInsertPercent = 100 - r.rodPosition;
        rods.forEach(rod => {
            rod.style.transform = `translateY(${-rodInsertPercent}%)`;
        });

        // Update core glow based on power
        const glowIntensity = r.power / 100;
        const glowColor = r.temperature > 800
            ? `rgba(255, ${Math.max(0, 150 - (r.temperature - 800))}, 0, ${glowIntensity})`
            : `rgba(0, ${100 + glowIntensity * 100}, 255, ${glowIntensity * 0.5})`;
        this.elements.coreGlow.style.background = `radial-gradient(ellipse at bottom, ${glowColor} 0%, transparent 70%)`;

        // Update gauge bars
        this.elements.powerBar.style.width = `${Math.min(r.power, 100)}%`;
        this.elements.tempBar.style.width = `${Math.min(r.temperature / 10, 100)}%`;

        // Velocity bar - centered at 50%, expands left or right
        const velocityPercent = Math.min(Math.abs(r.powerVelocity) / 50, 1) * 50;
        if (r.powerVelocity >= 0) {
            this.elements.velocityBar.style.left = '50%';
            this.elements.velocityBar.style.width = `${velocityPercent}%`;
            this.elements.velocityBar.classList.remove('negative');
            this.elements.velocityBar.classList.add('positive');
        } else {
            this.elements.velocityBar.style.left = `${50 - velocityPercent}%`;
            this.elements.velocityBar.style.width = `${velocityPercent}%`;
            this.elements.velocityBar.classList.remove('positive');
            this.elements.velocityBar.classList.add('negative');
        }

        // Update temperature bar color
        this.elements.tempBar.classList.remove('warning', 'danger');
        if (r.temperature > 900) {
            this.elements.tempBar.classList.add('danger');
        } else if (r.temperature > 700) {
            this.elements.tempBar.classList.add('warning');
        }

        // Update values
        this.elements.powerValue.textContent = `${r.power.toFixed(1)}%`;
        this.elements.tempValue.textContent = `${Math.floor(r.temperature)}°C`;
        const velocitySign = r.powerVelocity >= 0 ? '+' : '';
        this.elements.velocityValue.textContent = `${velocitySign}${r.powerVelocity.toFixed(1)}/s`;
        this.elements.rodPosValue.textContent = `${Math.floor(r.rodPosition)}%`;

        // Update status display
        this.elements.statusDisplay.classList.remove('warning', 'danger');
        if (r.temperature > 900) {
            this.elements.statusDisplay.textContent = '⚠ CRITICAL TEMPERATURE ⚠';
            this.elements.statusDisplay.classList.add('danger');
        } else if (r.temperature > 700) {
            this.elements.statusDisplay.textContent = '⚠ HIGH TEMPERATURE ⚠';
            this.elements.statusDisplay.classList.add('warning');
        } else if (r.power < 10) {
            this.elements.statusDisplay.textContent = '⚠ LOW POWER WARNING ⚠';
            this.elements.statusDisplay.classList.add('warning');
        } else {
            this.elements.statusDisplay.textContent = 'REACTOR NOMINAL';
        }

        // Update scores
        this.elements.points.textContent = Math.floor(r.points);
        this.elements.time.textContent = `${r.timeRunning.toFixed(1)}s`;
    }

    gameLoop() {
        const currentTime = performance.now();
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (!this.gameOver) {
            this.handleInput(dt);
            this.reactor.update(dt);

            // Check game over conditions
            if (this.reactor.isCritical) {
                this.gameOver = true;
                this.showGameOver(false, 'Core temperature exceeded 1000°C', 0);
            } else if (this.reactor.isStalled) {
                this.gameOver = true;
                this.showGameOver(false, 'Reactor stalled - power dropped too low', 0);
            }
        }

        this.updateDisplay();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    new Game();
});
