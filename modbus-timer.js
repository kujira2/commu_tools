export class TimerManager {
    constructor(displayElement, onTimerEnd) {
        this.displayElement = displayElement;
        this.onTimerEnd = onTimerEnd;
        this.timerInterval = null;
        this.timerEndTime = null;
    }

    startTimer(durationMinutes, targetTemp) {
        if (this.timerInterval) {
            this.stopTimer();
        }

        this.timerEndTime = new Date(Date.now() + durationMinutes * 60000);
        this.updateDisplay();

        this.timerInterval = setInterval(() => {
            if (new Date() >= this.timerEndTime) {
                this.onTimerEnd(targetTemp);
                this.stopTimer();
            } else {
                this.updateDisplay();
            }
        }, 1000);

        return true;
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.timerEndTime = null;
        this.displayElement.textContent = '残り時間: --:--';
    }

    updateDisplay() {
        if (!this.timerEndTime) return;
        
        const now = new Date();
        const diff = this.timerEndTime - now;
        if (diff <= 0) {
            this.stopTimer();
            return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        this.displayElement.textContent = 
            `残り時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    isRunning() {
        return this.timerInterval !== null;
    }
}
