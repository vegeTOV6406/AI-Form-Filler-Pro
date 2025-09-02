async function handleYandexForms(profile, prompt, aiSettings) {
    console.log('Обработка Yandex Forms');
    const questions = document.querySelectorAll('div[data-qa*="question-"]');
    if (questions.length === 0) {
        console.error('Вопросы в Yandex Form не найдены.');
        return;
    }
    console.log(`Найдено вопросов: ${questions.length}`);
    for (const [index, questionBlock] of questions.entries()) {
        try {
            console.log(`Обработка вопроса ${index + 1}/${questions.length}`);
            const questionElement = questionBlock.querySelector('.Prose.Survey-QuestionTitle');
            if (!questionElement || !questionElement.textContent) {
                console.warn('Элемент вопроса не найден', questionBlock);
                continue;
            }
            const questionText = questionElement.textContent.trim();
            if (!questionText) continue;
            console.log(`Вопрос: ${questionText.substring(0, 50)}...`);
            
            // Передаем aiSettings, который теперь включает creativityLevel
            const aiResponse = await generateAIResponse(questionText, prompt, aiSettings, profile);
            
            console.log(`AI ответ: ${aiResponse.substring(0, 50)}...`);
            await fillYandexField(questionBlock, aiResponse);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Ошибка при заполнении вопроса в Yandex Form:', error);
        }
    }
}

async function fillYandexField(questionBlock, answer) {
    let textField = questionBlock.querySelector('input.Textinput-Control');
    if (textField) {
        textField.value = answer;
        textField.dispatchEvent(new Event('input', { bubbles: true }));
        textField.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Заполнено текстовое поле (input)');
        return true;
    }
    let textareaField = questionBlock.querySelector('textarea.Textarea-Control');
    if (textareaField) {
        textareaField.value = answer;
        textareaField.dispatchEvent(new Event('input', { bubbles: true }));
        textareaField.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Заполнено текстовое поле (textarea)');
        return true;
    }
    console.warn('Тип поля в Yandex Form не распознан', questionBlock);
    return false;
}