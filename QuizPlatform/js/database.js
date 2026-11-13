/* =========================
   QUIZ PLATFORM DATABASE
   Local Storage Version
========================= */

const QuizDatabase = (() => {

    const STORAGE_KEY = "quizPlatform_quizzes";

    function getAll() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);

            if (!data) return [];

            const quizzes = JSON.parse(data);

            return Array.isArray(quizzes) ? quizzes : [];

        } catch (error) {
            console.error("Database read error:", error);
            return [];
        }
    }

    function saveAll(quizzes) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
            return true;
        } catch (error) {
            console.error("Database save error:", error);
            return false;
        }
    }

    function create(quiz) {
        const quizzes = getAll();

        quizzes.push(quiz);

        return saveAll(quizzes);
    }

    function getById(id) {
        return getAll().find(quiz => quiz.id === id) || null;
    }

    function update(id, updatedData) {
        const quizzes = getAll();
        const index = quizzes.findIndex(quiz => quiz.id === id);

        if (index === -1) return false;

        quizzes[index] = {
            ...quizzes[index],
            ...updatedData,
            id
        };

        return saveAll(quizzes);
    }

    function remove(id) {
        const quizzes = getAll().filter(quiz => quiz.id !== id);

        return saveAll(quizzes);
    }

    function getStatistics() {
        const quizzes = getAll();

        return {
            totalQuizzes: quizzes.length,
            totalQuestions: quizzes.reduce(
                (sum, quiz) => sum + (quiz.questions?.length || 0),
                0
            ),
            publishedQuizzes: quizzes.filter(
                quiz => quiz.published === true
            ).length
        };
    }

    return {
        getAll,
        saveAll,
        create,
        getById,
        update,
        remove,
        getStatistics
    };

})();