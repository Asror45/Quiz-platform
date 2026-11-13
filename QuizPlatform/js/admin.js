/* =====================================
   QUIZ PLATFORM — ADMIN PANEL
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const quizTitle = $("quizTitle");
    const quizDescription = $("quizDescription");
    const quizIcon = $("quizIcon");

    const questionInput = $("questionInput");
    const answerInputs = [
        $("answerA"),
        $("answerB"),
        $("answerC"),
        $("answerD"),
        $("answerE")
    ];

    const addQuestionBtn = $("addQuestionBtn");
    const publishBtn = $("publishBtn");
    const importFile = $("importFile");
    const chooseFileBtn = $("chooseFileBtn");

    const questionsList = $("questionsList");
    const savedQuizzes = $("savedQuizzes");

    let questions = [];
    let editingIndex = -1;

    /* THEME */

    const themeToggle = $("themeToggle");

    function applyTheme() {
        const theme = localStorage.getItem("quizPlatform_theme") || "light";
        document.body.classList.toggle("dark", theme === "dark");

        if (themeToggle) {
            themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
        }
    }

    themeToggle?.addEventListener("click", () => {
        const dark = document.body.classList.toggle("dark");
        localStorage.setItem(
            "quizPlatform_theme",
            dark ? "dark" : "light"
        );
        applyTheme();
    });

    applyTheme();

    /* MESSAGES */

    function showMessage(elementId, message, type = "") {
        const element = $(elementId);
        if (!element) return;

        element.textContent = message;
        element.className = "message";

        if (type) {
            element.classList.add(type);
        }
    }

    /* DATABASE CHECK */

    if (typeof QuizDatabase === "undefined") {
        showMessage(
            "adminMessage",
            "Database қатесі. database.js файлын тексер.",
            "error"
        );
        return;
    }

    /* QUESTION VALIDATION */

    function getQuestionFromInputs() {
        const text = questionInput.value.trim();
        const answers = answerInputs.map(input => input.value.trim());

        if (!text) {
            showMessage("adminMessage", "Сұрақ мәтінін енгіз.", "error");
            return null;
        }

        if (answers.some(answer => !answer)) {
            showMessage(
                "adminMessage",
                "Барлық 5 жауап нұсқасын толтыр.",
                "error"
            );
            return null;
        }

        return {
            text,
            answers: answers.map((answer, index) => ({
                text: answer,
                correct: index === 0
            }))
        };
    }

    function clearQuestionInputs() {
        questionInput.value = "";
        answerInputs.forEach(input => input.value = "");
        editingIndex = -1;
        addQuestionBtn.textContent = "+ Сұрақ қосу";
    }

    /* ADD OR UPDATE QUESTION */

    addQuestionBtn.addEventListener("click", () => {
        const question = getQuestionFromInputs();
        if (!question) return;

        if (editingIndex >= 0) {
            questions[editingIndex] = question;
            showMessage("adminMessage", "Сұрақ өзгертілді.", "success");
        } else {
            questions.push(question);
            showMessage("adminMessage", "Сұрақ қосылды.", "success");
        }

        clearQuestionInputs();
        renderQuestions();
        updateStatistics();
    });

    /* RENDER QUESTIONS */

    function renderQuestions() {
        $("questionCount").textContent = `${questions.length} сұрақ`;

        if (questions.length === 0) {
            questionsList.innerHTML =
                '<div class="empty-state">Әзірге сұрақ қосылған жоқ.</div>';
            return;
        }

        questionsList.innerHTML = questions.map((question, index) => {
            const answers = question.answers.map((answer, answerIndex) => `
                <p>
                    ${String.fromCharCode(65 + answerIndex)})
                    ${escapeHTML(answer.text)}
                    ${answer.correct ? " ✓" : ""}
                </p>
            `).join("");

            return `
                <div class="question-item">
                    <h4>${index + 1}. ${escapeHTML(question.text)}</h4>
                    ${answers}
                    <div class="question-actions">
                        <button class="small-btn"
                            data-action="edit"
                            data-index="${index}"
                            type="button">Өзгерту</button>

                        <button class="small-btn delete"
                            data-action="delete"
                            data-index="${index}"
                            type="button">Өшіру</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    /* EDIT AND DELETE */

    questionsList.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const index = Number(button.dataset.index);
        const action = button.dataset.action;

        if (!Number.isInteger(index) || !questions[index]) return;

        if (action === "delete") {
            if (!confirm("Осы сұрақты өшіресің бе?")) return;

            questions.splice(index, 1);
            clearQuestionInputs();
            renderQuestions();
            updateStatistics();

            showMessage("adminMessage", "Сұрақ өшірілді.", "success");
        }

        if (action === "edit") {
            const question = questions[index];

            questionInput.value = question.text;

            answerInputs.forEach((input, answerIndex) => {
                input.value = question.answers[answerIndex]?.text || "";
            });

            editingIndex = index;
            addQuestionBtn.textContent = "Өзгерісті сақтау";

            questionInput.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });

    /* ESCAPE HTML */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    /* IMPORT BUTTON */

    chooseFileBtn.addEventListener("click", () => {
        importFile.click();
    });

    importFile.addEventListener("change", async () => {
        const file = importFile.files?.[0];
        if (!file) return;

        $("selectedFileName").textContent = file.name;
        showMessage("importStatus", "Файл оқылып жатыр...");

        try {
            const extension = file.name.split(".").pop().toLowerCase();
            let text = "";

            if (extension === "txt") {
                text = await readTXT(file);
            } else if (extension === "docx") {
                text = await readDOCX(file);
            } else if (extension === "pdf") {
                text = await readPDF(file);
            } else {
                throw new Error("Тек PDF, DOCX және TXT файлдары қабылданады.");
            }

            const importedQuestions = parseQuestions(text);

            if (importedQuestions.length === 0) {
                throw new Error(
                    "Сұрақтар табылмады. Файлдағы форматты тексер."
                );
            }

            const validQuestions = importedQuestions.filter(question =>
                question.text &&
                question.answers.length === 5 &&
                question.answers.every(answer => answer.text)
            );

            if (validQuestions.length === 0) {
                throw new Error(
                    "Дұрыс форматтағы сұрақ табылмады. Әр сұрақта A, B, C, D, E болуы керек."
                );
            }

            questions.push(...validQuestions);

            renderQuestions();
            updateStatistics();

            showMessage(
                "importStatus",
                `${validQuestions.length} сұрақ сәтті импортталды.`,
                "success"
            );

            if (validQuestions.length !== importedQuestions.length) {
                showMessage(
                    "adminMessage",
                    `${importedQuestions.length - validQuestions.length} сұрақ толық емес болғандықтан өткізілді.`,
                    "error"
                );
            }
        } catch (error) {
            console.error("Import error:", error);

            showMessage(
                "importStatus",
                error.message || "Файлды оқу кезінде қате пайда болды.",
                "error"
            );
        } finally {
            importFile.value = "";
        }
    });

    /* READ TXT */

    async function readTXT(file) {
        return await file.text();
    }

    /* READ DOCX */

    async function readDOCX(file) {
        if (typeof mammoth === "undefined") {
            throw new Error("DOCX кітапханасы жүктелмеді. Интернетті тексер.");
        }

        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });

        return result.value;
    }

    /* READ PDF */

    async function readPDF(file) {
        if (typeof pdfjsLib === "undefined") {
            throw new Error("PDF кітапханасы жүктелмеді. Интернетті тексер.");
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const buffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(buffer)
        }).promise;

        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();

            const items = content.items
                .filter(item => item.str && item.str.trim())
                .map(item => ({
                    text: item.str.trim(),
                    x: item.transform[4],
                    y: item.transform[5]
                }))
                .sort((a, b) => {
                    if (Math.abs(b.y - a.y) > 3) {
                        return b.y - a.y;
                    }
                    return a.x - b.x;
                });

            const lines = [];

            for (const item of items) {
                let line = lines.find(
                    current => Math.abs(current.y - item.y) <= 3
                );

                if (!line) {
                    line = { y: item.y, items: [] };
                    lines.push(line);
                }

                line.items.push(item);
            }

            const pageText = lines
                .sort((a, b) => b.y - a.y)
                .map(line =>
                    line.items
                        .sort((a, b) => a.x - b.x)
                        .map(item => item.text)
                        .join(" ")
                )
                .join("\n");

            pages.push(pageText);
        }

        return pages.join("\n\n");
    }

    /* PARSE QUESTIONS */

    function parseQuestions(rawText) {
        if (!rawText || !rawText.trim()) return [];

        const normalized = rawText
            .replace(/\r\n?/g, "\n")
            .replace(/\u00a0/g, " ")
            .replace(/[ \t]+/g, " ")
            .trim();

        const lines = normalized
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);

        const blocks = [];
        let currentBlock = [];

        const questionStart = /^(?:сұрақ|сурак|question)\s*[:：\-]\s*/i;
        const numberedQuestion = /^\d{1,4}[.)]\s+\S/;

        for (const line of lines) {
            const isNewQuestion =
                questionStart.test(line) ||
                (
                    numberedQuestion.test(line) &&
                    currentBlock.some(item => /^[A-EА-Е][).:]/i.test(item))
                );

            if (isNewQuestion && currentBlock.length > 0) {
                blocks.push(currentBlock);
                currentBlock = [];
            }

            currentBlock.push(line);
        }

        if (currentBlock.length) {
            blocks.push(currentBlock);
        }

        const result = [];

        for (const block of blocks) {
            const answerMap = {};
            const questionLines = [];

            for (const line of block) {
                const answerMatch = line.match(
                    /^([A-EА-Е])\s*[).:：\-]\s*(.*)$/i
                );

                if (answerMatch) {
                    let letter = answerMatch[1].toUpperCase();

                    const kazakhLetters = {
                        "А": "A",
                        "В": "B",
                        "С": "C",
                        "Д": "D",
                        "Е": "E"
                    };

                    letter = kazakhLetters[letter] || letter;
                    answerMap[letter] = answerMatch[2].trim();
                } else {
                    questionLines.push(line);
                }
            }

            const letters = ["A", "B", "C", "D", "E"];

            if (!letters.every(letter => answerMap[letter])) {
                continue;
            }

            const questionText = questionLines
                .join(" ")
                .replace(/^(?:сұрақ|сурак|question)\s*[:：\-]\s*/i, "")
                .replace(/^\d{1,4}[.)]\s*/, "")
                .trim();

            if (!questionText) continue;

            result.push({
                text: questionText,
                answers: letters.map((letter, index) => ({
                    text: answerMap[letter],
                    correct: index === 0
                }))
            });
        }

        return result;
    }

    /* PUBLISH QUIZ */

    publishBtn.addEventListener("click", () => {
        const title = quizTitle.value.trim();
        const description = quizDescription.value.trim();
        const icon = quizIcon.value.trim() || "📝";

        if (!title) {
            showMessage("adminMessage", "Тест атауын енгіз.", "error");
            return;
        }

        if (questions.length === 0) {
            showMessage("adminMessage", "Алдымен сұрақ қос.", "error");
            return;
        }

        const quiz = {
            id: createID(),
            title,
            description,
            icon,
            questions: questions.map(question => ({
                text: question.text,
                answers: question.answers.map((answer, index) => ({
                    text: answer.text,
                    correct: index === 0
                }))
            })),
            published: true,
            createdAt: new Date().toISOString()
        };

        const saved = QuizDatabase.create(quiz);

        if (!saved) {
            showMessage(
                "adminMessage",
                "Тестті сақтау мүмкін болмады. Браузер жадын тексер.",
                "error"
            );
            return;
        }

        showMessage(
            "adminMessage",
            "Тест сәтті жарияланды!",
            "success"
        );

        questions = [];
        clearQuestionInputs();

        quizTitle.value = "";
        quizDescription.value = "";
        quizIcon.value = "📝";

        renderQuestions();
        renderSavedQuizzes();
        updateStatistics();
    });

    function createID() {
        return "quiz_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 9);
    }

    /* SAVED QUIZZES */

    function renderSavedQuizzes() {
        const quizzes = QuizDatabase.getAll();

        if (quizzes.length === 0) {
            savedQuizzes.innerHTML =
                '<div class="empty-state">Әзірге тест жоқ.</div>';
            return;
        }

        savedQuizzes.innerHTML = quizzes.map(quiz => `
            <div class="saved-quiz-item">
                <h3>${escapeHTML(quiz.icon || "📝")} ${escapeHTML(quiz.title)}</h3>

                <p class="muted">
                    ${quiz.questions?.length || 0} сұрақ
                    · ${quiz.published ? "Жарияланған" : "Жарияланбаған"}
                </p>

                <div class="saved-quiz-actions">
                    <button
                        class="small-btn"
                        data-quiz-action="copy"
                        data-id="${escapeHTML(quiz.id)}"
                        type="button">Сілтемені көшіру</button>

                    <button
                        class="small-btn delete"
                        data-quiz-action="delete"
                        data-id="${escapeHTML(quiz.id)}"
                        type="button">Өшіру</button>
                </div>
            </div>
        `).join("");
    }

    savedQuizzes.addEventListener("click", async event => {
        const button = event.target.closest("button[data-quiz-action]");
        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.quizAction;
        const quiz = QuizDatabase.getById(id);

        if (!quiz) return;

        if (action === "delete") {
            if (!confirm("Осы тестті толығымен өшіресің бе?")) return;

            QuizDatabase.remove(id);
            renderSavedQuizzes();
            updateStatistics();

            showMessage("adminMessage", "Тест өшірілді.", "success");
        }

        if (action === "copy") {
            const url = new URL("quiz.html", window.location.href);
            url.searchParams.set("id", id);

            try {
                await navigator.clipboard.writeText(url.href);
                showMessage(
                    "adminMessage",
                    "Сілтеме көшірілді. Бұл әзірге осы браузердегі тестке арналған.",
                    "success"
                );
            } catch (error) {
                showMessage(
                    "adminMessage",
                    "Сілтемені көшіру мүмкін болмады.",
                    "error"
                );
            }
        }
    });

    /* STATISTICS */

    function updateStatistics() {
        const stats = QuizDatabase.getStatistics();

        $("totalQuizzes").textContent = stats.totalQuizzes;
        $("totalQuestions").textContent = stats.totalQuestions;
        $("publishedQuizzes").textContent = stats.publishedQuizzes;
    }

    /* INITIAL LOAD */

    renderQuestions();
    renderSavedQuizzes();
    updateStatistics();
});