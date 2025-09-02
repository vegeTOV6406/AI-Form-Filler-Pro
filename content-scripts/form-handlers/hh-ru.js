async function handleHhRuForm(profile, prompt, aiSettings) {
    console.log('Обработка формы отклика на hh.ru');
    const questions = document.querySelectorAll('div[data-qa="task-body"]');
    if (questions.length === 0) {
        console.error('Вопросы на странице отклика hh.ru не найдены.');
        return;
    }
    console.log(`Найдено вопросов: ${questions.length}`);
    for (const [index, questionBlock] of questions.entries()) {
        try {
            console.log(`Обработка вопроса ${index + 1}/${questions.length}`);
            const questionElement = questionBlock.querySelector('div[data-qa="task-question"]');
            if (!questionElement) {
                console.warn('Элемент вопроса не найден в блоке:', questionBlock);
                continue;
            }
            const questionText = questionElement.textContent.trim();
            if (!questionText) continue;
            console.log(`Вопрос: ${questionText.substring(0, 70)}...`);
            
            // Передаем aiSettings, который теперь включает creativityLevel
            const aiResponse = await generateAIResponse(questionText, prompt, aiSettings, profile);
            
            console.log(`AI ответ: ${aiResponse.substring(0, 70)}...`);
            const field = questionBlock.querySelector('textarea[name*="task_"]');
            if (field) {
                field.value = aiResponse;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Заполнено текстовое поле.');
            } else {
                console.warn('Поле для ответа не найдено для вопроса:', questionText);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Ошибка при заполнении вопроса на hh.ru:', error);
        }
    }
}