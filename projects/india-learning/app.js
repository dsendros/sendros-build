// Indian States Quiz - Vanilla JavaScript Implementation

// ===================
// DATA
// ===================

const indianStates = [
    { name: 'Andhra Pradesh', capital: 'Amaravati', region: 'South', abbr: 'AP' },
    { name: 'Arunachal Pradesh', capital: 'Itanagar', region: 'Northeast', abbr: 'AR' },
    { name: 'Assam', capital: 'Dispur', region: 'Northeast', abbr: 'AS' },
    { name: 'Bihar', capital: 'Patna', region: 'East', abbr: 'BR' },
    { name: 'Chhattisgarh', capital: 'Raipur', region: 'Central', abbr: 'CG' },
    { name: 'Goa', capital: 'Panaji', region: 'West', abbr: 'GA' },
    { name: 'Gujarat', capital: 'Gandhinagar', region: 'West', abbr: 'GJ' },
    { name: 'Haryana', capital: 'Chandigarh', region: 'North', abbr: 'HR' },
    { name: 'Himachal Pradesh', capital: 'Shimla', region: 'North', abbr: 'HP' },
    { name: 'Jharkhand', capital: 'Ranchi', region: 'East', abbr: 'JH' },
    { name: 'Karnataka', capital: 'Bengaluru', region: 'South', abbr: 'KA' },
    { name: 'Kerala', capital: 'Thiruvananthapuram', region: 'South', abbr: 'KL' },
    { name: 'Madhya Pradesh', capital: 'Bhopal', region: 'Central', abbr: 'MP' },
    { name: 'Maharashtra', capital: 'Mumbai', region: 'West', abbr: 'MH' },
    { name: 'Manipur', capital: 'Imphal', region: 'Northeast', abbr: 'MN' },
    { name: 'Meghalaya', capital: 'Shillong', region: 'Northeast', abbr: 'ML' },
    { name: 'Mizoram', capital: 'Aizawl', region: 'Northeast', abbr: 'MZ' },
    { name: 'Nagaland', capital: 'Kohima', region: 'Northeast', abbr: 'NL' },
    { name: 'Odisha', capital: 'Bhubaneswar', region: 'East', abbr: 'OD' },
    { name: 'Punjab', capital: 'Chandigarh', region: 'North', abbr: 'PB' },
    { name: 'Rajasthan', capital: 'Jaipur', region: 'North', abbr: 'RJ' },
    { name: 'Sikkim', capital: 'Gangtok', region: 'Northeast', abbr: 'SK' },
    { name: 'Tamil Nadu', capital: 'Chennai', region: 'South', abbr: 'TN' },
    { name: 'Telangana', capital: 'Hyderabad', region: 'South', abbr: 'TG' },
    { name: 'Tripura', capital: 'Agartala', region: 'Northeast', abbr: 'TR' },
    { name: 'Uttar Pradesh', capital: 'Lucknow', region: 'North', abbr: 'UP' },
    { name: 'Uttarakhand', capital: 'Dehradun', region: 'North', abbr: 'UK' },
    { name: 'West Bengal', capital: 'Kolkata', region: 'East', abbr: 'WB' }
];

// Region label positions (approximate centers for each region)
const regionLabelPositions = {
    'North': { x: 195, y: 175 },
    'South': { x: 320, y: 545 },
    'East': { x: 420, y: 340 },
    'West': { x: 115, y: 380 },
    'Central': { x: 280, y: 320 },
    'Northeast': { x: 500, y: 250 }
};

// State label positions (approximate centers for each state)
const stateLabelPositions = {
    'Andhra Pradesh': { x: 305, y: 500 },
    'Arunachal Pradesh': { x: 555, y: 220 },
    'Assam': { x: 510, y: 265 },
    'Bihar': { x: 395, y: 285 },
    'Chhattisgarh': { x: 320, y: 365 },
    'Goa': { x: 185, y: 485 },
    'Gujarat': { x: 140, y: 340 },
    'Haryana': { x: 195, y: 195 },
    'Himachal Pradesh': { x: 210, y: 155 },
    'Jharkhand': { x: 385, y: 320 },
    'Karnataka': { x: 230, y: 500 },
    'Kerala': { x: 235, y: 580 },
    'Madhya Pradesh': { x: 260, y: 315 },
    'Maharashtra': { x: 210, y: 415 },
    'Manipur': { x: 545, y: 305 },
    'Meghalaya': { x: 490, y: 280 },
    'Mizoram': { x: 535, y: 330 },
    'Nagaland': { x: 545, y: 265 },
    'Odisha': { x: 360, y: 385 },
    'Punjab': { x: 180, y: 175 },
    'Rajasthan': { x: 170, y: 265 },
    'Sikkim': { x: 445, y: 250 },
    'Tamil Nadu': { x: 275, y: 560 },
    'Telangana': { x: 280, y: 445 },
    'Tripura': { x: 520, y: 315 },
    'Uttar Pradesh': { x: 290, y: 250 },
    'Uttarakhand': { x: 240, y: 180 },
    'West Bengal': { x: 430, y: 320 }
};

// ===================
// STATE
// ===================

const QuizState = {
    screen: 'menu',        // 'menu' | 'mapSelect' | 'game' | 'results'
    gameType: null,        // 'map' | 'mapFind' | 'capital' | 'region' | 'matchAll'
    questions: [],
    currentQuestion: 0,
    score: 0,
    selectedAnswer: null,
    showResult: false,
    // Match All States mode state
    matchAllState: {
        selectedStateName: null,  // Currently selected state from list
        matchedStates: [],        // Array of state names that have been matched
        wrongGuesses: 0,          // Total wrong guess count
        isBlinking: false         // State name currently blinking (or false)
    }
};

// ===================
// SVG ICONS
// ===================

const icons = {
    map: `<svg class="icon map" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>`,
    star: `<svg class="icon star" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>`,
    compass: `<svg class="icon compass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.343-6.657l-1.414 1.414M6.757 17.243l-1.414 1.414m0-11.314l1.414 1.414m10.486 10.486l1.414 1.414M12 8l3 4-3 4-3-4 3-4z" />
    </svg>`,
    award: `<svg class="quiz-results-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>`
};

// ===================
// INDIA SVG MAP
// ===================

let INDIA_SVG_MAP = null;

async function loadMap() {
    try {
        const response = await fetch('india.svg');
        const svgText = await response.text();
        // Parse the SVG and add the india-map class
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        svg.classList.add('india-map');
        // Add viewBox if not present (needed for proper scaling)
        if (!svg.getAttribute('viewBox')) {
            const width = svg.getAttribute('width') || 612;
            const height = svg.getAttribute('height') || 696;
            svg.setAttribute('viewBox', `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
        }
        // Remove fixed dimensions so CSS can control size
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        INDIA_SVG_MAP = svg.outerHTML;
    } catch (error) {
        console.error('Failed to load map:', error);
    }
}

// ===================
// QUESTION GENERATION
// ===================

function generateQuestions(type) {
    const shuffled = [...indianStates].sort(() => Math.random() - 0.5);
    const numQuestions = 10;

    return shuffled.slice(0, numQuestions).map(state => {
        const correctAnswer = type === 'capital' ? state.capital :
                             type === 'region' ? state.region :
                             state.name;

        let options;
        if (type === 'capital') {
            const otherStates = indianStates.filter(s => s.name !== state.name);
            const wrongAnswers = otherStates
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(s => s.capital);
            options = [...wrongAnswers, correctAnswer].sort(() => Math.random() - 0.5);
        } else if (type === 'region') {
            const allRegions = ['North', 'South', 'East', 'West', 'Central', 'Northeast'];
            const wrongRegions = allRegions.filter(r => r !== correctAnswer);
            const selectedWrong = wrongRegions.sort(() => Math.random() - 0.5).slice(0, 3);
            options = [...selectedWrong, correctAnswer].sort(() => Math.random() - 0.5);
        } else if (type === 'map') {
            const otherStates = indianStates.filter(s => s.name !== state.name);
            const wrongAnswers = otherStates
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(s => s.name);
            options = [...wrongAnswers, correctAnswer].sort(() => Math.random() - 0.5);
        } else if (type === 'mapFind') {
            // No options needed - user clicks on the map
            options = [];
        }

        return {
            state: state.name,
            correctAnswer,
            options,
            type
        };
    });
}

// ===================
// GAME LOGIC
// ===================

function showMapSelect() {
    QuizState.screen = 'mapSelect';
    renderScreen();
}

function startGame(type) {
    QuizState.gameType = type;
    QuizState.questions = generateQuestions(type);
    QuizState.currentQuestion = 0;
    QuizState.score = 0;
    QuizState.selectedAnswer = null;
    QuizState.showResult = false;
    QuizState.screen = 'game';
    renderScreen();
}

function handleAnswer(answer) {
    QuizState.selectedAnswer = answer;
    QuizState.showResult = true;
    if (answer === QuizState.questions[QuizState.currentQuestion].correctAnswer) {
        QuizState.score++;
    }
    renderScreen();
}

function nextQuestion() {
    if (QuizState.currentQuestion < QuizState.questions.length - 1) {
        QuizState.currentQuestion++;
        QuizState.selectedAnswer = null;
        QuizState.showResult = false;
        QuizState.screen = 'game';
    } else {
        QuizState.screen = 'results';
    }
    renderScreen();
}

function restartGame() {
    QuizState.screen = 'menu';
    QuizState.gameType = null;
    QuizState.questions = [];
    QuizState.currentQuestion = 0;
    QuizState.score = 0;
    QuizState.selectedAnswer = null;
    QuizState.showResult = false;
    renderScreen();
}

function playAgain() {
    const currentType = QuizState.gameType;
    if (currentType === 'matchAll') {
        startMatchAllGame();
    } else {
        startGame(currentType);
    }
}

// ===================
// MATCH ALL STATES MODE
// ===================

function startMatchAllGame() {
    QuizState.gameType = 'matchAll';
    QuizState.screen = 'game';
    QuizState.matchAllState = {
        selectedStateName: null,
        matchedStates: [],
        wrongGuesses: 0,
        isBlinking: false
    };
    renderScreen();
}

function selectStateFromList(stateName) {
    // Only allow selection if state hasn't been matched yet
    if (QuizState.matchAllState.matchedStates.includes(stateName)) {
        return;
    }
    QuizState.matchAllState.selectedStateName = stateName;
    renderScreen();
}

function handleMatchAllMapClick(clickedStateName) {
    const selectedState = QuizState.matchAllState.selectedStateName;

    // No state selected from list - ignore click
    if (!selectedState) {
        return;
    }

    // Already matched this state - ignore
    if (QuizState.matchAllState.matchedStates.includes(clickedStateName)) {
        return;
    }

    if (clickedStateName === selectedState) {
        // Correct match!
        QuizState.matchAllState.matchedStates.push(selectedState);
        QuizState.matchAllState.selectedStateName = null;

        // Check if game complete
        if (QuizState.matchAllState.matchedStates.length === indianStates.length) {
            QuizState.screen = 'results';
        }
    } else {
        // Wrong guess - trigger blink animation
        QuizState.matchAllState.wrongGuesses++;
        QuizState.matchAllState.isBlinking = clickedStateName;

        // Clear blink after animation
        setTimeout(() => {
            QuizState.matchAllState.isBlinking = false;
            renderScreen();
        }, 600);
    }

    renderScreen();
}

// ===================
// RENDER FUNCTIONS
// ===================

function renderScreen() {
    const root = document.getElementById('root');
    root.innerHTML = '';

    switch (QuizState.screen) {
        case 'menu':
            renderMenuScreen(root);
            break;
        case 'mapSelect':
            renderMapSelectScreen(root);
            break;
        case 'game':
            renderGameScreen(root);
            break;
        case 'results':
            renderResultsScreen(root);
            break;
    }
}

function renderMenuScreen(container) {
    const menu = document.createElement('div');
    menu.className = 'quiz-menu';
    menu.innerHTML = `
        <div class="quiz-title">
            <h1>Indian States Quiz</h1>
            <p>Test your knowledge of India's 28 states!</p>
        </div>
        <div class="quiz-options">
            <button class="quiz-option-card" onclick="showMapSelect()">
                ${icons.map}
                <h2>Map Quiz</h2>
                <p>Identify states by their location on the map</p>
            </button>
            <button class="quiz-option-card" onclick="startGame('capital')">
                ${icons.star}
                <h2>Capital Cities Quiz</h2>
                <p>Match each state with its capital city</p>
            </button>
            <button class="quiz-option-card" onclick="startGame('region')">
                ${icons.compass}
                <h2>Regions Quiz</h2>
                <p>Identify which region each state belongs to</p>
            </button>
        </div>
    `;
    container.appendChild(menu);
}

function renderMapSelectScreen(container) {
    const selectScreen = document.createElement('div');
    selectScreen.className = 'quiz-menu';
    selectScreen.innerHTML = `
        <div class="quiz-title">
            <h1>Map Quiz</h1>
            <p>Choose your challenge</p>
        </div>
        <div class="quiz-options">
            <button class="quiz-option-card" onclick="startGame('map')">
                ${icons.map}
                <h2>Name the State</h2>
                <p>See a highlighted state and choose its name</p>
            </button>
            <button class="quiz-option-card" onclick="startGame('mapFind')">
                ${icons.compass}
                <h2>Find the State</h2>
                <p>See a state name and click on it on the map</p>
            </button>
            <button class="quiz-option-card" onclick="startMatchAllGame()">
                ${icons.star}
                <h2>Match All States</h2>
                <p>Match all 28 states from a list to the map</p>
            </button>
        </div>
        <button class="quiz-back-btn" onclick="restartGame()">← Back to Menu</button>
    `;
    container.appendChild(selectScreen);
}

function renderGameScreen(container) {
    // Handle Match All mode separately
    if (QuizState.gameType === 'matchAll') {
        renderMatchAllGame(container);
        return;
    }

    const question = QuizState.questions[QuizState.currentQuestion];
    const questionText = QuizState.gameType === 'capital'
        ? `What is the capital of ${question.state}?`
        : QuizState.gameType === 'region'
        ? `Which region is ${question.state} in?`
        : QuizState.gameType === 'mapFind'
        ? `Find: ${question.state}`
        : 'Which state is highlighted on the map?';

    const game = document.createElement('div');
    game.className = 'quiz-game';

    // Header
    const header = document.createElement('div');
    header.className = 'quiz-header';
    header.innerHTML = `
        <span>Question ${QuizState.currentQuestion + 1} of ${QuizState.questions.length}</span>
        <span class="score">Score: ${QuizState.score}</span>
    `;
    game.appendChild(header);

    // Card
    const card = document.createElement('div');
    card.className = 'quiz-card';

    // Question
    const questionEl = document.createElement('h2');
    questionEl.className = 'quiz-question';
    questionEl.textContent = questionText;
    card.appendChild(questionEl);

    // Map (if map or capital quiz)
    if (QuizState.gameType === 'map' || QuizState.gameType === 'capital') {
        const mapEl = renderMap(
            question.state,
            QuizState.showResult && QuizState.selectedAnswer === question.correctAnswer,
            QuizState.showResult && QuizState.selectedAnswer !== question.correctAnswer
        );
        card.appendChild(mapEl);
    }

    // Interactive Map (if mapFind quiz)
    if (QuizState.gameType === 'mapFind') {
        const mapEl = renderInteractiveMap(
            question.correctAnswer,
            QuizState.selectedAnswer,
            QuizState.showResult
        );
        card.appendChild(mapEl);
    }

    // Region Map (if region quiz)
    if (QuizState.gameType === 'region') {
        const mapEl = renderRegionMap(
            question.state,
            QuizState.showResult && QuizState.selectedAnswer === question.correctAnswer,
            QuizState.showResult && QuizState.selectedAnswer !== question.correctAnswer
        );
        card.appendChild(mapEl);
    }

    // Answer options (not for mapFind - user clicks the map instead)
    if (QuizState.gameType !== 'mapFind') {
        const answersEl = document.createElement('div');
        answersEl.className = 'quiz-answers';

        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-answer-btn';
            btn.textContent = option;

            if (QuizState.showResult) {
                btn.disabled = true;
                if (option === question.correctAnswer) {
                    btn.classList.add('correct');
                } else if (option === QuizState.selectedAnswer) {
                    btn.classList.add('wrong');
                } else {
                    btn.classList.add('neutral');
                }
            } else {
                btn.onclick = () => handleAnswer(option);
            }

            answersEl.appendChild(btn);
        });
        card.appendChild(answersEl);
    }

    // Feedback (if showing result)
    if (QuizState.showResult) {
        const feedback = document.createElement('div');
        feedback.className = 'quiz-feedback';

        const isCorrect = QuizState.selectedAnswer === question.correctAnswer;
        const message = document.createElement('div');
        message.className = `quiz-feedback-message ${isCorrect ? 'correct' : 'wrong'}`;
        message.textContent = isCorrect
            ? 'Correct!'
            : `Wrong! The correct answer is ${question.correctAnswer}`;
        feedback.appendChild(message);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'quiz-next-btn';
        nextBtn.textContent = QuizState.currentQuestion < QuizState.questions.length - 1
            ? 'Next Question'
            : 'See Results';
        nextBtn.onclick = nextQuestion;
        feedback.appendChild(nextBtn);

        card.appendChild(feedback);
    }

    game.appendChild(card);
    container.appendChild(game);
}

function renderMap(highlightedState, isCorrect, isWrong) {
    const mapContainer = document.createElement('div');
    mapContainer.className = 'quiz-map';

    // Insert the SVG map
    mapContainer.innerHTML = INDIA_SVG_MAP;

    // Find and highlight the target state
    const statePath = mapContainer.querySelector(`path[title="${highlightedState}"]`);
    if (statePath) {
        if (isCorrect) {
            statePath.classList.add('correct');
        } else if (isWrong) {
            statePath.classList.add('wrong');
        } else {
            statePath.classList.add('highlighted');
        }
    }

    return mapContainer;
}

function renderInteractiveMap(correctState, selectedState, showResult) {
    const mapContainer = document.createElement('div');
    mapContainer.className = 'quiz-map';

    // Insert the SVG map
    mapContainer.innerHTML = INDIA_SVG_MAP;

    // Add interactive class to the SVG
    const svg = mapContainer.querySelector('svg');
    if (svg) {
        svg.classList.add('interactive');
    }

    // Get all state paths
    const statePaths = mapContainer.querySelectorAll('path[title]');

    statePaths.forEach(path => {
        const stateName = path.getAttribute('title');

        if (showResult) {
            // After answer - show feedback
            if (stateName === correctState) {
                path.classList.add('correct');
            } else if (stateName === selectedState && selectedState !== correctState) {
                path.classList.add('wrong');
            }
        } else {
            // Before answer - make clickable and hoverable
            path.addEventListener('click', () => handleMapAnswer(stateName));
            path.addEventListener('mouseenter', () => path.classList.add('hover'));
            path.addEventListener('mouseleave', () => path.classList.remove('hover'));
        }
    });

    return mapContainer;
}

function handleMapAnswer(clickedState) {
    const question = QuizState.questions[QuizState.currentQuestion];
    QuizState.selectedAnswer = clickedState;
    QuizState.showResult = true;
    if (clickedState === question.correctAnswer) {
        QuizState.score++;
    }
    renderScreen();
}

function renderRegionMap(targetState, isCorrect, isWrong) {
    const mapContainer = document.createElement('div');
    mapContainer.className = 'quiz-map';

    // Insert the SVG map
    mapContainer.innerHTML = INDIA_SVG_MAP;

    const svg = mapContainer.querySelector('svg');

    // Color all states by their region
    indianStates.forEach(state => {
        const statePath = mapContainer.querySelector(`path[title="${state.name}"]`);
        if (statePath) {
            const regionClass = `region-${state.region.toLowerCase()}`;
            statePath.classList.add(regionClass);
        }
    });

    // If showing result, highlight the target state with correct/wrong color
    if (isCorrect || isWrong) {
        const targetPath = mapContainer.querySelector(`path[title="${targetState}"]`);
        if (targetPath) {
            // Remove region class and add result class
            targetPath.removeAttribute('class');
            targetPath.classList.add(isCorrect ? 'correct' : 'wrong');
        }
    }

    // Add region labels
    if (svg) {
        Object.entries(regionLabelPositions).forEach(([region, pos]) => {
            // Create background rect for better readability
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('x', pos.x - 35);
            bg.setAttribute('y', pos.y - 10);
            bg.setAttribute('width', 70);
            bg.setAttribute('height', 16);
            bg.setAttribute('rx', 3);
            bg.setAttribute('class', 'region-label-bg');
            svg.appendChild(bg);

            // Create text label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y);
            text.setAttribute('class', 'region-label');
            text.textContent = region;
            svg.appendChild(text);
        });
    }

    return mapContainer;
}

function renderResultsScreen(container) {
    // Handle Match All mode differently
    if (QuizState.gameType === 'matchAll') {
        renderMatchAllResults(container);
        return;
    }

    const percentage = (QuizState.score / QuizState.questions.length) * 100;
    let message;
    if (percentage >= 80) {
        message = 'Excellent work!';
    } else if (percentage >= 60) {
        message = 'Good job! Keep practicing!';
    } else {
        message = 'Keep learning! You can do it!';
    }

    const results = document.createElement('div');
    results.className = 'quiz-results';
    results.innerHTML = `
        <div class="quiz-results-card">
            ${icons.award}
            <h2>Quiz Complete!</h2>
            <div class="quiz-results-score">${QuizState.score}/${QuizState.questions.length}</div>
            <p class="quiz-results-message">${message}</p>
            <button class="quiz-play-again-btn" onclick="playAgain()">Play Again</button>
            <button class="quiz-menu-btn" onclick="restartGame()">Return to Menu</button>
        </div>
    `;
    container.appendChild(results);
}

function renderMatchAllResults(container) {
    const wrongGuesses = QuizState.matchAllState.wrongGuesses;
    let message;

    if (wrongGuesses === 0) {
        message = 'Perfect! You matched every state without a single mistake!';
    } else if (wrongGuesses <= 5) {
        message = 'Excellent work! You really know your Indian geography!';
    } else if (wrongGuesses <= 15) {
        message = 'Good job! Keep practicing to improve!';
    } else {
        message = 'Nice effort! Study the map and try again!';
    }

    const results = document.createElement('div');
    results.className = 'quiz-results';
    results.innerHTML = `
        <div class="quiz-results-card">
            ${icons.award}
            <h2>All States Matched!</h2>
            <div class="quiz-results-score">${indianStates.length}/${indianStates.length}</div>
            <div class="wrong-guess-result">Wrong guesses: ${wrongGuesses}</div>
            <p class="quiz-results-message">${message}</p>
            <button class="quiz-play-again-btn" onclick="playAgain()">Play Again</button>
            <button class="quiz-menu-btn" onclick="restartGame()">Return to Menu</button>
        </div>
    `;
    container.appendChild(results);
}

function renderMatchAllGame(container) {
    const { selectedStateName, matchedStates, wrongGuesses } = QuizState.matchAllState;

    const game = document.createElement('div');
    game.className = 'match-all-game';

    // Header with progress and wrong guesses
    const header = document.createElement('div');
    header.className = 'match-all-header';
    header.innerHTML = `
        <span class="progress">${matchedStates.length} of ${indianStates.length} matched</span>
        <span class="wrong-count">Wrong guesses: ${wrongGuesses}</span>
    `;
    game.appendChild(header);

    // Main content - side by side layout
    const content = document.createElement('div');
    content.className = 'match-all-content';

    // Left panel - state list
    const leftPanel = document.createElement('div');
    leftPanel.className = 'match-all-list-panel';
    leftPanel.appendChild(renderStateList(matchedStates, selectedStateName));
    content.appendChild(leftPanel);

    // Right panel - map
    const rightPanel = document.createElement('div');
    rightPanel.className = 'match-all-map-panel';

    // Instruction above map
    const instruction = document.createElement('div');
    instruction.className = 'match-all-instruction';
    instruction.textContent = selectedStateName
        ? `Find: ${selectedStateName}`
        : 'Select a state from the list';
    rightPanel.appendChild(instruction);

    rightPanel.appendChild(renderMatchAllMap(matchedStates, selectedStateName));
    content.appendChild(rightPanel);

    game.appendChild(content);
    container.appendChild(game);
}

function renderStateList(matchedStates, selectedStateName) {
    const unmatchedStates = indianStates.filter(s => !matchedStates.includes(s.name));

    const listContainer = document.createElement('div');
    listContainer.className = 'state-list-container';

    // Unmatched states section
    const unmatchedSection = document.createElement('div');
    unmatchedSection.className = 'state-list-section';

    const unmatchedTitle = document.createElement('h3');
    unmatchedTitle.className = 'state-list-title';
    unmatchedTitle.textContent = 'States to Match';
    unmatchedSection.appendChild(unmatchedTitle);

    const unmatchedList = document.createElement('div');
    unmatchedList.className = 'state-list';

    // Sort alphabetically for easier finding
    const sortedUnmatched = [...unmatchedStates].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    sortedUnmatched.forEach(state => {
        const stateBtn = document.createElement('button');
        stateBtn.className = 'state-list-item';
        if (state.name === selectedStateName) {
            stateBtn.classList.add('selected');
        }
        stateBtn.textContent = state.name;
        stateBtn.onclick = () => selectStateFromList(state.name);
        unmatchedList.appendChild(stateBtn);
    });

    unmatchedSection.appendChild(unmatchedList);
    listContainer.appendChild(unmatchedSection);

    // Completed states section (only show if there are matched states)
    if (matchedStates.length > 0) {
        const completedSection = document.createElement('div');
        completedSection.className = 'state-list-section completed';

        const completedTitle = document.createElement('h3');
        completedTitle.className = 'state-list-title';
        completedTitle.textContent = `Completed (${matchedStates.length})`;
        completedSection.appendChild(completedTitle);

        const completedList = document.createElement('div');
        completedList.className = 'state-list completed-list';

        const sortedMatched = [...matchedStates].sort();
        sortedMatched.forEach(stateName => {
            const stateItem = document.createElement('div');
            stateItem.className = 'state-list-item completed';
            const stateData = indianStates.find(s => s.name === stateName);
            stateItem.textContent = `${stateName} (${stateData.abbr})`;
            completedList.appendChild(stateItem);
        });

        completedSection.appendChild(completedList);
        listContainer.appendChild(completedSection);
    }

    return listContainer;
}

function renderMatchAllMap(matchedStates, selectedStateName) {
    const mapContainer = document.createElement('div');
    mapContainer.className = 'quiz-map match-all-map';

    // Insert the SVG map
    mapContainer.innerHTML = INDIA_SVG_MAP;

    const svg = mapContainer.querySelector('svg');
    if (svg) {
        svg.classList.add('interactive');
    }

    // Get all state paths
    const statePaths = mapContainer.querySelectorAll('path[title]');

    statePaths.forEach(path => {
        const stateName = path.getAttribute('title');

        // Check if this state is in our 28 states list
        const stateData = indianStates.find(s => s.name === stateName);
        if (!stateData) {
            // Union territories or other regions - make non-interactive
            path.classList.add('non-state');
            return;
        }

        if (matchedStates.includes(stateName)) {
            // Already matched - show as correct with label
            path.classList.add('matched');
            addStateLabel(svg, stateName, stateData.abbr);
        } else if (QuizState.matchAllState.isBlinking === stateName) {
            // Wrong guess - blinking red
            path.classList.add('wrong-blink');
        } else {
            // Available for clicking
            path.addEventListener('click', () => handleMatchAllMapClick(stateName));
            path.addEventListener('mouseenter', () => {
                if (selectedStateName) {
                    path.classList.add('hover');
                }
            });
            path.addEventListener('mouseleave', () => path.classList.remove('hover'));

            // Visual cue that map is interactive when a state is selected
            if (selectedStateName) {
                path.classList.add('clickable');
            }
        }
    });

    return mapContainer;
}

function addStateLabel(svg, stateName, abbr) {
    const pos = stateLabelPositions[stateName];
    if (!pos) return;

    // Create background rect for label
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', pos.x - 12);
    bg.setAttribute('y', pos.y - 10);
    bg.setAttribute('width', 24);
    bg.setAttribute('height', 14);
    bg.setAttribute('rx', 2);
    bg.setAttribute('class', 'state-label-bg');
    svg.appendChild(bg);

    // Create text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y + 2);
    text.setAttribute('class', 'state-label');
    text.textContent = abbr;
    svg.appendChild(text);
}

// ===================
// INITIALIZATION
// ===================

document.addEventListener('DOMContentLoaded', async () => {
    await loadMap();
    renderScreen();
});
