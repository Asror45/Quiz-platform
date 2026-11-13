/* =====================================
   QUIZ PLATFORM — MAIN PAGE
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const quizGrid = document.getElementById("quizGrid");
    const emptyState = document.getElementById("emptyState");
    const noResults = document.getElementById("noResults");
    const searchInput = document.getElementById("searchInput");
    const themeToggle = document.getElementById("themeToggle");

    /* DATABASE CHECK */

    if (typeof QuizDatabase === "undefined") {
        quizGrid.innerHTML =
            '<div class="empty-state">Database қатесі. database.js файлын тексер.</div>';
        return;
    }

    /* THEME */

    function applyTheme() {
        const theme = localStorage.getItem("quizPlatform_theme") || "light";

        document.body.classList.toggle("dark", theme === "dark");

        if (themeToggle) {
            themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
        }
    }

    themeToggle?.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");

        localStorage.setItem(
            "quizPlatform_theme",
            isDark ? "dark" : "light"
        );

        applyTheme();
    });

    applyTheme();

    /* HTML SECURITY */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    /* LOAD QUIZZES */

    function renderQuizzes(search = "") {
        const quizzes = QuizDatabase.getAll().filter(
            quiz => quiz.published === true
        );

        const filteredQuizzes = quizzes.filter(quiz => {
            const title = String(quiz.title || "").toLowerCase();
            const description = String(quiz.description || "").toLowerCase();
            const query = search.trim().toLowerCase();

            return title.includes(query) || description.includes(query);
        });

        quizGrid.innerHTML = "";

        emptyState.hidden = quizzes.length > 0;
        noResults.hidden = !(
            quizzes.length > 0 && filteredQuizzes.length === 0
        );

        if (filteredQuizzes.length === 0) {
            return;
        }

        filteredQuizzes.forEach(quiz => {
            const card = document.createElement("a");

            card.className = "quiz-card";
            card.href = `quiz.html?id=${encodeURIComponent(quiz.id)}`;

            const icon = escapeHTML(quiz.icon || "📝");
            const title = escapeHTML(quiz.title || "Атаусыз тест");
            const description = escapeHTML(
                quiz.description || "Бұл тестті орындап, біліміңді тексер."
            );

            const count = Array.isArray(quiz.questions)
                ? quiz.questions.length
                : 0;

            card.innerHTML = `
                <div class="quiz-icon">${icon}</div>

                <h3>${title}</h3>

                <p>${description}</p>

                <p class="muted" style="margin-top:14px;">
                    ${count} сұрақ
                </p>

                <span class="btn btn-primary"
                    style="width:100%;margin-top:16px;">
                    Тестті бастау →
                </span>
            `;

            quizGrid.appendChild(card);
        });
    }

    /* SEARCH */

    searchInput?.addEventListener("input", () => {
        renderQuizzes(searchInput.value);
    });

    /* INITIAL */

    renderQuizzes();
});