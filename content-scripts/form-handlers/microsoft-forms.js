async function handleMicrosoftForms(profile, prompt, aiSettings) {
  console.log('Обработка Microsoft Forms');
  let questions = Array.from(document.querySelectorAll('div[role="listitem"], .office-form-question')).filter(el => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
  });
  console.log(`Найдено вопросов: ${questions.length}`);
  if (questions.length === 0) {
    console.error('Вопросы не найдены');
    return;
  }
  for (const [index, questionBlock] of questions.entries()) {
    try {
      console.log(`Обработка вопроса ${index + 1}/${questions.length}`);
      const questionElement = questionBlock.querySelector('.question-title-box, .text-format-content');
      if (!questionElement) {
        console.warn('Элемент вопроса не найден', questionBlock);
        continue;
      }
      const questionText = questionElement.textContent.trim();
      console.log(`Вопрос: ${questionText.substring(0, 50)}...`);
      
      // Передаем aiSettings, который теперь включает creativityLevel
      const aiResponse = await generateAIResponse(questionText, prompt, aiSettings, profile);
      
      console.log(`AI ответ: ${aiResponse.substring(0, 50)}...`);
      await fillMicrosoftFormField(questionBlock, aiResponse);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Ошибка при заполнении вопроса:', error);
    }
  }
}

async function fillMicrosoftFormField(questionBlock, answer) {
  let field = questionBlock.querySelector('input[type="text"], input[type="email"], textarea, input[type="number"]');
  if (field) {
    field.value = answer;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('Заполнено текстовое поле');
    return;
  }
  const radioOptions = questionBlock.querySelectorAll('input[type="radio"]');
  if (radioOptions.length > 0) {
    await selectOptionByText(radioOptions, answer);
    return;
  }
  const checkboxOptions = questionBlock.querySelectorAll('input[type="checkbox"]');
  if (checkboxOptions.length > 0) {
    await selectOptionByText(checkboxOptions, answer);
    return;
  }
  const select = questionBlock.querySelector('select');
  if (select) {
    await handleSelectField(select, answer);
    return;
  }
  console.warn('Тип поля не распознан', questionBlock);
}