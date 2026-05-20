let gameBoard = [];
let currentNumber = 1;
let time = 0;
let timerInterval = null;
let gameActive = true;
let totalNumbers = 16;

const gameBoardElement = document.getElementById('gameBoard');
const timerElement = document.getElementById('timer');
const nextNumberElement = document.getElementById('nextNumber');
const resetButton = document.getElementById('reset');
const finishBanner = document.getElementById('finishBanner');
const finishText = document.getElementById('finishText');
const playAgainBtn = document.getElementById('playAgainBtn');

function updateCell(row, col, isCorrect = true) {
    const cells = document.querySelectorAll('.cell');
    const index = row * 4 + col;
    const cell = cells[index];
    
    if (isCorrect) {
        cell.classList.add('clicked', 'disabled');
        cell.textContent = '✓';
        cell.classList.add('correct');
        setTimeout(() => cell.classList.remove('correct'), 200);
    } else {
        cell.classList.add('wrong');
        setTimeout(() => cell.classList.remove('wrong'), 300);
    }
}

function renderBoard() {
    if (!gameBoardElement) return;
    
    gameBoardElement.innerHTML = '';
    
    for (let i = 0; i < gameBoard.length; i++) {
        const row = document.createElement('div');
        row.className = 'board-row';
        
        for (let j = 0; j < gameBoard[i].length; j++) {
            const cell = document.createElement('div');
            const cellNumber = gameBoard[i][j];
            cell.className = 'cell';
            
            if (cellNumber < currentNumber) {
                cell.classList.add('clicked', 'disabled');
                cell.textContent = '✓';
            } else {
                cell.textContent = cellNumber;
            }
            
            cell.onclick = (function(num, rowIdx, colIdx) {
                return function() { handleCellClick(num, rowIdx, colIdx); };
            })(cellNumber, i, j);
            
            row.appendChild(cell);
        }
        gameBoardElement.appendChild(row);
    }
}

function handleCellClick(number, row, col) {
    if (!gameActive) return;
    if (number < currentNumber) return;
    
    if (number === currentNumber) {
        updateCell(row, col, true);
        currentNumber++;
        updateNextNumberDisplay();
        
        if (currentNumber > totalNumbers) {
            endGame(true);
        }
    } else {
        updateCell(row, col, false);
    }
}

function updateNextNumberDisplay() {
    if (nextNumberElement) {
        nextNumberElement.textContent = currentNumber <= totalNumbers ? currentNumber : '✓';
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    time = 0;
    if (timerElement) timerElement.textContent = '0';
    
    timerInterval = setInterval(() => {
        if (gameActive && currentNumber <= totalNumbers) {
            time++;
            if (timerElement) timerElement.textContent = time;
        }
    }, 1000);
}

async function endGame(victory) {
    if (!victory) return;
    
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    
    try {
        const response = await fetch('/api/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeInSeconds: time })
        });
        if (response.ok) console.log('Результат сохранён!');
    } catch (error) {
        console.error('Ошибка:', error);
    }
    
    if (finishBanner && finishText) {
        finishText.textContent = `Ваше время: ${time} секунд! 🎉`;
        finishBanner.style.display = 'flex';
    }
}

async function loadNewBoard() {
    try {
        const response = await fetch('/api/new-board');
        const data = await response.json();
        gameBoard = data.board;
        currentNumber = 1;
        gameActive = true;
        updateNextNumberDisplay();
        renderBoard();
    } catch (error) {
        console.error('Ошибка:', error);
        createTestBoard();
        renderBoard();
    }
}

function createTestBoard() {
    const numbers = [];
    for (let i = 1; i <= 16; i++) numbers.push(i);
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    gameBoard = [];
    for (let i = 0; i < 4; i++) {
        gameBoard.push(numbers.slice(i * 4, (i + 1) * 4));
    }
}

async function resetGame() {
    if (timerInterval) clearInterval(timerInterval);
    gameActive = true;
    currentNumber = 1;
    if (finishBanner) finishBanner.style.display = 'none';
    await loadNewBoard();
    startTimer();
}

if (resetButton) resetButton.addEventListener('click', resetGame);
if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
if (finishBanner) {
    finishBanner.addEventListener('click', (e) => {
        if (e.target === finishBanner) finishBanner.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadNewBoard();
    startTimer();
});