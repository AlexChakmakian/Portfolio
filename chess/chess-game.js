// Chess game logic - Optimized for performance
'use strict';

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', initGame);

// Global variables
let board = null;
let game = null;
let engineThinking = false;
let myOpeningBook = {};
let moveSound;
let victorySound;
let openingBookLoaded = false;

// At the top of chess-game.js, add this constant:
const FUNCTION_APP_URL = 'https://chessleaderboarddb.azurewebsites.net';

// Initialize the game
function initGame() {
    // Initialize Chess.js
    game = new Chess();
    
    // Configure and create the board
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        // Make the board fully responsive by not setting a fixed width
        responsive: true
    };
    
    // Create board when ChessBoard.js is loaded
    if (typeof Chessboard !== 'undefined') {
        board = Chessboard('myBoard', config);
        
        // Ensure proper sizing on initialization
        setTimeout(() => {
            if (board) board.resize();
        }, 100);
        
        // Ensure proper sizing on window resize
        window.addEventListener('resize', function() {
            if (board) board.resize();
        });
    } else {
        // If ChessBoard.js isn't loaded yet, wait and try again
        setTimeout(initGame, 100);
        return;
    }
    
    // Initialize sounds - but don't load them until needed
    initSound();
    
    // Set up UI event listeners
    document.getElementById('startBtn').addEventListener('click', function() {
        if (!engineThinking) startNewGame();
    });
    
    document.getElementById('undoBtn').addEventListener('click', function() {
        if (engineThinking) return;
        game.undo(); // Undo the opponent's move
        if (game.turn() === 'b') {
            game.undo(); // Undo your move too
        }
        board.position(game.fen());
        updateStatus();
    });
    
    // Disable document scrolling when touching the chess board
    const boardElement = document.getElementById('myBoard');
    if (boardElement) {
        boardElement.addEventListener('touchstart', function(e) {
            e.preventDefault();
        });
        
        boardElement.addEventListener('touchmove', function(e) {
            e.preventDefault();
        });
    }
    
    // Initialize leaderboard
    setupLeaderboardModal();
    initializeLeaderboard();
    
    // Initial status update
    updateStatus();
    
    // Load personal opening book in the background after the page is loaded
    setTimeout(loadPersonalOpeningBook, 1000);
}

// Initialize sound - lazy load to improve performance
function initSound() {
    // Don't create Audio objects until needed
    moveSound = null;
    victorySound = null;
    
    // Enable audio on first user interaction (required for mobile)
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
}

// Function to enable audio system
function enableAudio() {
    // Only create Audio objects when needed - improves initial load time
    if (!moveSound) {
        moveSound = new Audio('https://lichess1.org/assets/sound/standard/Move.mp3');
        moveSound.volume = 0.2;
    }
    
    if (!victorySound) {
        victorySound = new Audio('https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3');
        victorySound.volume = 0.4;
    }
    
    // Play and immediately pause to activate audio system
    moveSound.play().then(() => {
        moveSound.pause();
        moveSound.currentTime = 0;
        console.log('Audio system enabled');
    }).catch(e => {
        console.log('Could not enable audio:', e);
    });
}

// Simple play function that works on all devices
function playMoveSound() {
    if (!moveSound) {
        moveSound = new Audio('https://lichess1.org/assets/sound/standard/Move.mp3');
        moveSound.volume = 0.2;
    }
    
    // Create a fresh instance for each play (works better on mobile)
    const sound = new Audio(moveSound.src);
    sound.volume = moveSound.volume;
    sound.play().catch(e => {}); // Ignore errors
}

// Initialize sample leaderboard data if none exists
function initializeLeaderboard() {
    const savedLeaderboard = localStorage.getItem('chessLeaderboard');
    if (!savedLeaderboard) {
        const sampleData = [
            { name: "Pedro", date: "March 15, 2024", moves: 32 },
            { name: "Alexander", date: "March 14, 2024", moves: 28 },
            { name: "Isabella", date: "March 13, 2024", moves: 35 },
            { name: "Charles", date: "March 12, 2024", moves: 30 }
        ];
        localStorage.setItem('chessLeaderboard', JSON.stringify(sampleData));
    }
}

function loadLeaderboardData() {
    initializeLeaderboard(); // Ensure we have data
    const savedLeaderboard = localStorage.getItem('chessLeaderboard');
    if (savedLeaderboard) {
        const leaderboard = JSON.parse(savedLeaderboard);
        const tbody = document.getElementById('leaderboard-data');
        if (!tbody) return;
        
        tbody.innerHTML = ''; // Clear existing rows
        
        // Sort by moves (ascending) and date (descending)
        leaderboard.sort((a, b) => {
            if (a.moves === b.moves) {
                return new Date(b.date) - new Date(a.date);
            }
            return a.moves - b.moves;
        });
        
        leaderboard.forEach((player, index) => {
            const rankClass = index < 3 ? `rank-${index+1}` : '';
            const row = document.createElement('tr');
            row.className = rankClass;
            row.innerHTML = `
                <td><div class="rank-badge">${index + 1}</div></td>
                <td>${player.name}</td>
                <td>${player.date}</td>
                <td>${player.moves}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function saveToLeaderboard(entry) {
    const savedLeaderboard = localStorage.getItem('chessLeaderboard');
    let leaderboard = [];
    
    if (savedLeaderboard) {
        leaderboard = JSON.parse(savedLeaderboard);
    }
    
    // Add new entry
    leaderboard.push(entry);
    
    // Sort by moves (ascending) and date (descending)
    leaderboard.sort((a, b) => {
        if (a.moves === b.moves) {
            return new Date(b.date) - new Date(a.date);
        }
        return a.moves - b.moves;
    });
    
    // Keep only top 10 entries
    if (leaderboard.length > 10) {
        leaderboard = leaderboard.slice(0, 10);
    }
    
    // Save back to localStorage
    localStorage.setItem('chessLeaderboard', JSON.stringify(leaderboard));
    
    // Update the display
    loadLeaderboardData();
}

// Update the leaderboard modal setup to use local storage
function setupLeaderboardModal() {
    const modal = document.getElementById('leaderboardModal');
    const btn = document.getElementById('leaderboardBtn');
    const modalContent = document.getElementById('leaderboardContent');
    
    if (window.leaderboardInitialized) return;
    window.leaderboardInitialized = true;
    
    // Create the leaderboard content structure
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Chess Leaderboard</h2>
            <span class="close">&times;</span>
        </div>
        <div class="modal-body">
            <p class="subheading">Top players who have beaten the bot</p>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Date</th>
                        <th>Moves</th>
                    </tr>
                </thead>
                <tbody id="leaderboard-data">
                    <!-- Data will be loaded here -->
                </tbody>
            </table>
        </div>
        <div class="modal-footer">
            <p>Can you make it to the top?</p>
        </div>
    `;
    
    // Add close button functionality
    const closeBtn = modalContent.querySelector('.close');
    closeBtn.addEventListener('click', function() {
        modal.style.display = "none";
    });
    
    btn.addEventListener('click', function() {
        modal.style.display = "block";
        loadLeaderboardData();
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}

function recordVictory() {
    // Get player name
    const playerName = prompt("Congratulations on beating the bot! Enter your name for the leaderboard:", "");
    
    if (playerName) {
        // Get current date
        const today = new Date();
        const date = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Record number of moves
        const moves = Math.ceil(game.history().length / 2);
        
        // Create leaderboard entry
        const entry = {
            name: playerName,
            date: date,
            moves: moves
        };
        
        // Save to leaderboard
        saveToLeaderboard(entry);
    }
}

// Function to load and parse PGN files
function loadPersonalOpeningBook() {
    if (openingBookLoaded) return;
    
    console.log('Loading personal opening book...');
    
    // Use fetch instead of jQuery AJAX for better performance
    fetch('my-games.pgn')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            console.log('PGN data loaded successfully');
            // Parse the PGN data
            const games = parsePGN(data);
            console.log(`Found ${games.length} games in PGN file`);
            // Build the opening book from your games
            buildOpeningBook(games);
            console.log('Personal opening book built successfully');
            openingBookLoaded = true;
        })
        .catch(error => {
            console.error('Error loading personal opening book:', error);
        });
}

// Simple PGN parser
function parsePGN(pgn) {
    const games = [];
    // Split the PGN text into individual games
    const gameTexts = pgn.split(/\n\s*\n\s*\[Event/);
    
    for (let i = 0; i < gameTexts.length; i++) {
        let gameText = i === 0 ? gameTexts[i] : '[Event' + gameTexts[i];
        
        // Extract moves section (after the header)
        const moveTextMatch = gameText.match(/\n\s*\n\s*(.*?)(\s*\n\s*\n|\s*$)/s);
        if (moveTextMatch) {
            const moveText = moveTextMatch[1];
            
            // Clean up the move text
            const cleanedMoves = moveText
                .replace(/\{[^}]*\}/g, '') // Remove comments
                .replace(/\d+\s*\.\s*/g, '') // Remove move numbers
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/1-0|0-1|1\/2-1\/2|\*/g, '') // Remove result
                .trim();
            
            if (cleanedMoves) {
                const moves = cleanedMoves.split(' ').filter(move => move.length > 0);
                games.push(moves);
            }
        }
    }
    
    return games;
}

// Build an opening book from the parsed games
function buildOpeningBook(games) {
    games.forEach(movesArray => {
        let tempGame = new Chess();
        
        for (let i = 0; i < Math.min(10, movesArray.length); i++) {
            // Only consider the first 10 moves for the opening
            const move = movesArray[i];
            
            // Skip results and empty moves
            if (!move || move === '1-0' || move === '0-1' || move === '1/2-1/2' || move === '*') continue;
            
            const position = tempGame.fen().split(' ').slice(0, 4).join(' ');
            
            if (!myOpeningBook[position]) {
                myOpeningBook[position] = [];
            }
            
            // Try to make the move
            try {
                const result = tempGame.move(move);
                if (result) {
                    myOpeningBook[position].push({
                        move: result.san,
                        weight: 1
                    });
                }
            } catch (e) {
                console.warn('Invalid move found in PGN:', move);
                // Skip invalid moves
                continue;
            }
        }
    });
    
    // Consolidate moves and assign weights based on frequency
    Object.keys(myOpeningBook).forEach(position => {
        const movesMap = {};
        
        myOpeningBook[position].forEach(entry => {
            if (!movesMap[entry.move]) {
                movesMap[entry.move] = 0;
            }
            movesMap[entry.move] += entry.weight;
        });
        
        myOpeningBook[position] = Object.keys(movesMap).map(move => ({
            move: move,
            weight: movesMap[move]
        }));
    });
    
    console.log(`Opening book contains ${Object.keys(myOpeningBook).length} positions`);
}

// These are piece values for evaluating board position
const pieceValues = {
    'p': 100,  // pawn
    'n': 320,  // knight
    'b': 330,  // bishop
    'r': 500,  // rook
    'q': 900,  // queen
    'k': 20000 // king
};

// Piece-square tables for positional evaluation
const pawnEval = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightEval = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopEval = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookEval = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenEval = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,   5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const kingEval = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

// Function to start a new game
function startNewGame() {
    game = new Chess();
    board.position('start');
    updateStatus();
    engineThinking = false;
    document.getElementById('loading').classList.remove('active');
}

function onDragStart(source, piece) {
    // Don't allow moving pieces if the game is over or engine is thinking
    if (game.game_over() || engineThinking) return false;
    // Only allow white pieces to be moved (player is white)
    if (piece.search(/^b/) !== -1) return false;
}

// Get position value for a piece based on its position and type
function getPiecePositionValue(piece, x, y) {
    if (!piece) return 0;
    
    // Flip coordinates for black pieces
    const row = piece.color === 'w' ? y : 7 - y;
    const col = piece.color === 'w' ? x : 7 - x;
    
    let positionValue = 0;
    switch (piece.type) {
        case 'p': positionValue = pawnEval[row][col]; break;
        case 'n': positionValue = knightEval[row][col]; break;
        case 'b': positionValue = bishopEval[row][col]; break;
        case 'r': positionValue = rookEval[row][col]; break;
        case 'q': positionValue = queenEval[row][col]; break;
        case 'k': positionValue = kingEval[row][col]; break;
    }
    
    return positionValue;
}

// Advanced evaluation - considers material + position
function evaluateBoard() {
    let totalEvaluation = 0;
    let board = game.board();
    
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                // Calculate base value + position value
                const baseValue = pieceValues[piece.type];
                const positionValue = getPiecePositionValue(piece, j, i);
                
                // Add values for black, subtract for white
                if (piece.color === 'b') {
                    totalEvaluation += baseValue + positionValue;
                } else {
                    totalEvaluation -= baseValue + positionValue;
                }
            }
        }
    }
    
    return totalEvaluation;
}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    // Early exit for checkmate/stalemate
    const possibleMoves = game.moves();
    if (depth === 0 || possibleMoves.length === 0) {
        if (possibleMoves.length === 0) {
            return game.in_check() ? 
                (isMaximizingPlayer ? -Infinity : Infinity) : 0; // Checkmate or stalemate
        }
        return evaluateBoard();
    }
    
    // Sort captures first for better pruning
    possibleMoves.sort(function(a, b) {
        const moveCaptureValue = (move) => {
            return move.indexOf('x') !== -1 ? 10 : 0;
        };
        return moveCaptureValue(b) - moveCaptureValue(a);
    });
    
    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        
        for (const move of possibleMoves) {
            game.move(move);
            const evalScore = minimax(depth - 1, alpha, beta, false);
            game.undo();
            
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            
            if (beta <= alpha) {
                break; // Alpha-Beta pruning
            }
        }
        
        return maxEval;
    } else {
        let minEval = Infinity;
        
        for (const move of possibleMoves) {
            game.move(move);
            const evalScore = minimax(depth - 1, alpha, beta, true);
            game.undo();
            
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            
            if (beta <= alpha) {
                break; // Alpha-Beta pruning
            }
        }
        
        return minEval;
    }
}

// Updated findBestMove function to use the opening book
function findBestMove() {
    const possibleMoves = game.moves();
    
    if (possibleMoves.length === 0) return null;
    
    // Check if we're in the opening phase (first 10 moves)
    if (game.history().length < 10 && openingBookLoaded) {
        // Try to use opening book
        const position = game.fen().split(' ').slice(0, 4).join(' ');
        
        if (myOpeningBook[position] && myOpeningBook[position].length > 0) {
            console.log('Using opening book for this position');
            // Calculate total weights for weighted random selection
            const totalWeight = myOpeningBook[position].reduce((sum, entry) => sum + entry.weight, 0);
            let randomWeight = Math.random() * totalWeight;
            
            // Select move based on weight
            for (const entry of myOpeningBook[position]) {
                randomWeight -= entry.weight;
                if (randomWeight <= 0) {
                    console.log('Selected opening book move:', entry.move);
                    return entry.move;
                }
            }
        } else {
            console.log('No matching position in opening book');
        }
    }
    
    console.log('Using minimax for this position');
    // Fall back to minimax if opening book doesn't have this position
    let bestMove = null;
    let bestEval = -Infinity;
    const searchDepth = 3; // Higher depth is stronger but slower
    
    for (const move of possibleMoves) {
        game.move(move);
        const moveEval = minimax(searchDepth - 1, -Infinity, Infinity, false);
        game.undo();
        
        if (moveEval > bestEval) {
            bestEval = moveEval;
            bestMove = move;
        }
    }
    
    return bestMove || possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
}

function onDrop(source, target) {
    // Don't allow moves during engine thinking
    if (engineThinking) return 'snapback';

    // See if the move is legal
    const move = game.move({ 
        from: source, 
        to: target, 
        promotion: 'q' // Always promote to a queen for simplicity
    });
    
    // Illegal move
    if (move === null) return 'snapback';
    
    // Play sound using our simple method
    playMoveSound();
    
    updateStatus();
    
    // Make the AI move after a short delay
    setTimeout(makeComputerMove, 250);
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';
    let isMyTurn = game.turn() === 'w'; // Assuming "you" play as White
    
    let moveText = isMyTurn ? 'Your Move' : 'My Move';
    let playerCheck = isMyTurn ? 'You are' : 'I am';

    // Checkmate?
    if (game.in_checkmate()) {
        if (!isMyTurn) {
            // Player (white) has checkmated the AI (black)
            status = 'You won by checkmate!♜🎉';
            // Celebrate victory with confetti and sound
            setTimeout(celebrateVictory, 500);
            // Record victory in leaderboard
            setTimeout(recordVictory, 1500);
        } else {
            status = 'I checkmated you!♜😵';
        }
    }
    // Draw?
    else if (game.in_draw()) {
        status = 'Game is drawn♟️🤝';
    }
    // Game still on
    else {
        status = moveText;
        // Check?
        if (game.in_check()) {
            status += ', ' + playerCheck + ' in check';
        }
    }

    document.getElementById('status').innerHTML = status;
}

function celebrateVictory() {
    // Only load victory sound when needed
    if (!victorySound) {
        victorySound = new Audio('https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3');
        victorySound.volume = 0.4;
    }
    
    // Play victory sound
    victorySound.play().catch(e => {
        console.log('Could not play victory sound:', e);
    });
    
    // Check if confetti is loaded
    if (typeof confetti === 'function') {
        // Launch confetti from multiple points
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        
        // Use multiple confetti bursts for a more exciting effect
        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }
        
        // Create an interval that triggers confetti
        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            
            const particleCount = 50 * (timeLeft / duration);
            
            // Launch confetti from both sides and the top
            confetti(Object.assign({}, defaults, { 
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            }));
            
            confetti(Object.assign({}, defaults, { 
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            }));
        }, 250);
        
        // Add one big burst in the middle
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

function makeComputerMove() {
    if (game.game_over()) return;
    
    engineThinking = true;
    document.getElementById('loading').classList.add('active');
    
    // Use a timeout to allow the UI to update before starting the CPU-intensive calculation
    setTimeout(() => {
        const bestMove = findBestMove();
        
        if (bestMove) {
            game.move(bestMove);
            board.position(game.fen());
            playMoveSound();
        }
        
        engineThinking = false;
        document.getElementById('loading').classList.remove('active');
        updateStatus();
    }, 500);
}
