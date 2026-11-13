document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        loadingState: document.getElementById("loadingState"),
        errorState: document.getElementById("errorState"),
        errorMessage: document.getElementById("errorMessage"),
        quizContent: document.getElementById("quizContent"),
        resultContent: document.getElementById("resultContent"),

        quizTitle: document.getElementById("quizTitle"),
        quizDescription: document.getElementById("quizDescription"),

        questionCounter: document.getElementById("questionCounter"),
        progressBar: document.getElementById("progressBar"),
        questionNumber: document.getElementById("questionNumber"),
        questionText: document.getElementById("questionText"),
        answersList: document.getElementById("answersList"),

        nextQuestionBtn: document.getElementById("nextQuestionBtn"),
        answerFeedback: document.getElementById("answerFeedback"),

        resultScore: document.getElementById("resultScore"),
        resultPercentage: document.getElementById("resultPercentage"),
        resultMessage: document.getElementById("resultMessage"),
        restartBtn: document.getElementById("restartBtn"),

        themeToggle: document.getElementById("themeToggle")
    };

    let quiz = null;
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let answered = false;
    let autoNextTimer = null;

    const letters = ["A", "B", "C", "D", "E"];

    // Қате туралы хабарлама көрсету
    function showError(message) {
        clearTimeout(autoNextTimer);

        elements.loadingState.hidden = true;
        elements.quizContent.hidden = true;
        elements.resultContent.hidden = true;
        elements.errorState.hidden = false;

        elements.errorMessage.textContent = message;
    }

    // HTML қауіпсіздігі
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[char];
        });
    }

    // Жауаптарды араластыру
    function shuffleAnswers(answers) {
        const shuffled = answers.map(answer => ({ ...answer }));

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [shuffled[i], shuffled[j]] =
                [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    // Тест құрылымын тексеру
    function validateQuiz(data) {
        if (!data || !Array.isArray(data.questions)) {
            return "Тест немесе сұрақтар табылмады.";
        }

        if (data.questions.length === 0) {
            return "Бұл тестте сұрақ жоқ.";
        }

        for (let i = 0; i < data.questions.length; i++) {
            const question = data.questions[i];

            if (
                !question ||
                typeof question.text !== "string" ||
                !Array.isArray(question.answers) ||
                question.answers.length !== 5
            ) {
                return `${i + 1}-сұрақта қате бар. 5 жауап нұсқасы болуы керек.`;
            }

            const correctCount = question.answers.filter(
                answer => answer && answer.correct === true
            ).length;

            if (correctCount !== 1) {
                return `${i + 1}-сұрақта бір ғана дұрыс жауап болуы керек.`;
            }

            if (
                question.answers.some(
                    answer =>
                        !answer ||
                        typeof answer.text !== "string" ||
                        answer.text.trim() === ""
                )
            ) {
                return `${i + 1}-сұрақтың жауап нұсқалары толық емес.`;
            }
        }

        return null;
    }

    // Тестті жүктеу
    function loadQuiz() {
        if (typeof QuizDatabase === "undefined") {
            showError("Database.js файлы жүктелмеді. Файлдарды тексер.");
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const quizId = params.get("id");

        if (!quizId) {
            showError("Тест сілтемесінде ID көрсетілмеген.");
            return;
        }

        try {
            quiz = QuizDatabase.getById(quizId);
        } catch (error) {
            console.error(error);
            showError("Тестті жүктеу кезінде қате пайда болды.");
            return;
        }

        if (!quiz || quiz.published !== true) {
            showError("Тест табылмады немесе жарияланбаған.");
            return;
        }

        const validationError = validateQuiz(quiz);

        if (validationError) {
            showError(validationError);
            return;
        }

        questions = quiz.questions.map(question => ({
            text: question.text,
            answers: question.answers.map(answer => ({
                text: answer.text,
                correct: answer.correct === true
            }))
        }));

        elements.quizTitle.textContent = quiz.title || "Тест";
        elements.quizDescription.textContent = quiz.description || "";

        startQuiz();
    }

    // Тестті бастау немесе қайта бастау
    function startQuiz() {
        clearTimeout(autoNextTimer);

        currentQuestionIndex = 0;
        score = 0;
        answered = false;

        elements.loadingState.hidden = true;
        elements.errorState.hidden = true;
        elements.resultContent.hidden = true;
        elements.quizContent.hidden = false;

        renderQuestion();
    }

    // Сұрақты көрсету
    function renderQuestion() {
        clearTimeout(autoNextTimer);
        answered = false;

        const question = questions[currentQuestionIndex];

        if (!question) {
            showResult();
            return;
        }

        const total = questions.length;
        const current = currentQuestionIndex + 1;
        const progress = (current / total) * 100;

        elements.questionCounter.textContent =
            `${current} / ${total}`;

        elements.questionNumber.textContent =
            `Сұрақ ${current}`;

        elements.questionText.textContent = question.text;

        elements.progressBar.style.width = `${progress}%`;

        elements.answerFeedback.textContent = "";
        elements.answerFeedback.className = "message";
        elements.nextQuestionBtn.hidden = true;

        const shuffledAnswers = shuffleAnswers(question.answers);

        elements.answersList.innerHTML = "";

        shuffledAnswers.forEach((answer, index) => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "answer-option";

            button.innerHTML = `
                <span class="answer-letter">
                    ${letters[index]}
                </span>
                <span>${escapeHTML(answer.text)}</span>
            `;

            button.addEventListener("click", () => {
                selectAnswer(button, answer, shuffledAnswers);
            });

            elements.answersList.appendChild(button);
        });
    }

    // Жауапты тексеру
    function selectAnswer(selectedButton, selectedAnswer, shuffledAnswers) {
        if (answered) return;

        answered = true;

        const buttons = elements.answersList.querySelectorAll(
            ".answer-option"
        );

        buttons.forEach(button => {
            button.disabled = true;
        });

        const correctIndex = shuffledAnswers.findIndex(
            answer => answer.correct === true
        );

        if (selectedAnswer.correct) {
            score++;

            selectedButton.classList.add("correct");

            elements.answerFeedback.textContent =
                "Дұрыс жауап! Жарайсың!";

            elements.answerFeedback.className =
                "message success";

            // 2 секундтан кейін автоматты өту
            autoNextTimer = setTimeout(() => {
                goToNextQuestion();
            }, 2000);

        } else {
            selectedButton.classList.add("wrong");

            // Дұрыс жауапты жасыл түспен көрсету
            if (correctIndex !== -1) {
                buttons[correctIndex].classList.add("correct");
            }

            elements.answerFeedback.textContent =
                "Қате жауап. Жасыл түспен дұрыс жауап көрсетілді.";

            elements.answerFeedback.className =
                "message error";

            // Қате болса, қолданушы батырманы өзі басады
            elements.nextQuestionBtn.hidden = false;
        }
    }

    // Келесі сұраққа өту
    function goToNextQuestion() {
        clearTimeout(autoNextTimer);

        if (!answered) return;

        currentQuestionIndex++;

        if (currentQuestionIndex >= questions.length) {
            showResult();
            return;
        }

        renderQuestion();
    }

    // Нәтижені көрсету
    function showResult() {
        clearTimeout(autoNextTimer);

        elements.quizContent.hidden = true;
        elements.resultContent.hidden = false;

        const total = questions.length;
        const percentage = Math.round((score / total) * 100);

        elements.resultScore.textContent =
            `${score} / ${total}`;

        elements.resultPercentage.textContent =
            `${percentage}%`;

        if (percentage === 100) {
            elements.resultMessage.textContent =
                "Керемет! Барлық сұраққа дұрыс жауап бердің!";
        } else if (percentage >= 80) {
            elements.resultMessage.textContent =
                "Өте жақсы нәтиже!";
        } else if (percentage >= 60) {
            elements.resultMessage.textContent =
                "Жақсы нәтиже! Тағы да қайталап көр.";
        } else if (percentage >= 40) {
            elements.resultMessage.textContent =
                "Жаман емес. Тағы дайындалып көр.";
        } else {
            elements.resultMessage.textContent =
                "Көбірек дайындалу керек. Қайта байқап көр!";
        }
    }

    // Келесі сұрақ батырмасы
    elements.nextQuestionBtn.addEventListener("click", () => {
        goToNextQuestion();
    });

    // Қайта бастау
    elements.restartBtn.addEventListener("click", () => {
        startQuiz();
    });

    // Қараңғы режим
    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);

        if (elements.themeToggle) {
            elements.themeToggle.textContent =
                theme === "dark" ? "☀️" : "🌙";
        }
    }

    const savedTheme = localStorage.getItem("quizPlatform_theme") || "light";
    applyTheme(savedTheme);

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener("click", () => {
            const currentTheme =
                document.documentElement.getAttribute("data-theme");

            const newTheme =
                currentTheme === "dark" ? "light" : "dark";

            localStorage.setItem("quizPlatform_theme", newTheme);
            applyTheme(newTheme);
        });
    }

    // Тестті іске қосу
    loadQuiz();
});