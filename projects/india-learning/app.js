// Indian States Quiz - Vanilla JavaScript Implementation

// ===================
// DATA
// ===================

const indianStates = [
    { name: 'Andhra Pradesh', capital: 'Amaravati', region: 'South' },
    { name: 'Arunachal Pradesh', capital: 'Itanagar', region: 'Northeast' },
    { name: 'Assam', capital: 'Dispur', region: 'Northeast' },
    { name: 'Bihar', capital: 'Patna', region: 'East' },
    { name: 'Chhattisgarh', capital: 'Raipur', region: 'Central' },
    { name: 'Goa', capital: 'Panaji', region: 'West' },
    { name: 'Gujarat', capital: 'Gandhinagar', region: 'West' },
    { name: 'Haryana', capital: 'Chandigarh', region: 'North' },
    { name: 'Himachal Pradesh', capital: 'Shimla', region: 'North' },
    { name: 'Jharkhand', capital: 'Ranchi', region: 'East' },
    { name: 'Karnataka', capital: 'Bengaluru', region: 'South' },
    { name: 'Kerala', capital: 'Thiruvananthapuram', region: 'South' },
    { name: 'Madhya Pradesh', capital: 'Bhopal', region: 'Central' },
    { name: 'Maharashtra', capital: 'Mumbai', region: 'West' },
    { name: 'Manipur', capital: 'Imphal', region: 'Northeast' },
    { name: 'Meghalaya', capital: 'Shillong', region: 'Northeast' },
    { name: 'Mizoram', capital: 'Aizawl', region: 'Northeast' },
    { name: 'Nagaland', capital: 'Kohima', region: 'Northeast' },
    { name: 'Odisha', capital: 'Bhubaneswar', region: 'East' },
    { name: 'Punjab', capital: 'Chandigarh', region: 'North' },
    { name: 'Rajasthan', capital: 'Jaipur', region: 'North' },
    { name: 'Sikkim', capital: 'Gangtok', region: 'Northeast' },
    { name: 'Tamil Nadu', capital: 'Chennai', region: 'South' },
    { name: 'Telangana', capital: 'Hyderabad', region: 'South' },
    { name: 'Tripura', capital: 'Agartala', region: 'Northeast' },
    { name: 'Uttar Pradesh', capital: 'Lucknow', region: 'North' },
    { name: 'Uttarakhand', capital: 'Dehradun', region: 'North' },
    { name: 'West Bengal', capital: 'Kolkata', region: 'East' }
];

// ===================
// STATE
// ===================

const QuizState = {
    screen: 'menu',        // 'menu' | 'game' | 'results'
    gameType: null,        // 'map' | 'capital' | 'region'
    questions: [],
    currentQuestion: 0,
    score: 0,
    selectedAnswer: null,
    showResult: false
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
            <button class="quiz-option-card" onclick="startGame('map')">
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

function renderGameScreen(container) {
    const question = QuizState.questions[QuizState.currentQuestion];
    const questionText = QuizState.gameType === 'capital'
        ? `What is the capital of ${question.state}?`
        : QuizState.gameType === 'region'
        ? `Which region is ${question.state} in?`
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

    // Map (if map quiz)
    if (QuizState.gameType === 'map') {
        const mapEl = renderMap(
            question.state,
            QuizState.showResult && QuizState.selectedAnswer === question.correctAnswer,
            QuizState.showResult && QuizState.selectedAnswer !== question.correctAnswer
        );
        card.appendChild(mapEl);
    }

    // Answer options
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

function renderResultsScreen(container) {
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
            <button class="quiz-play-again-btn" onclick="restartGame()">Play Again</button>
        </div>
    `;
    container.appendChild(results);
}

// ===================
// INITIALIZATION
// ===================

document.addEventListener('DOMContentLoaded', async () => {
    await loadMap();
    renderScreen();
});
