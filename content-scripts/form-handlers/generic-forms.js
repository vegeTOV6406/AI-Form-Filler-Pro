async function handleGenericForm(profile, prompt, aiSettings) {
  console.log('Обработка стандартной веб-формы');
  const forms = document.querySelectorAll('form');
  if (forms.length === 0) {
    console.error('На странице не найдены теги <form>');
    return;
  }
  console.log(`Найдено форм на странице: ${forms.length}`);
  for (const form of forms) {
    const inputs = Array.from(form.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], textarea, select'
    )).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
    });
    for (const input of inputs) {
      try {
        let questionText = '';
        if (input.id) {
            const label = form.querySelector(`label[for="${input.id}"]`);
            if (label) questionText = label.textContent.trim();
        }
        if (!questionText) {
          const parentLabel = input.closest('label');
          if (parentLabel) questionText = parentLabel.textContent.trim();
        }
        if (!questionText && input.placeholder) {
          questionText = input.placeholder;
        }
        if (!questionText) {
          console.warn('Не удалось определить вопрос для поле:', input);
          continue;
        }
        console.log(`Вопрос: ${questionText.substring(0, 50)}...`);
        
        // Передаем aiSettings, который теперь включает creativityLevel
        const aiResponse = await generateAIResponse(questionText, prompt, aiSettings, profile);
        
        console.log(`AI ответ: ${aiResponse.substring(0, 50)}...`);
        if (input.tagName === 'SELECT') {
          await handleSelectField(input, aiResponse);
        } else {
          input.value = aiResponse;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Ошибка при заполнении поле:', error);
      }
    }
  }
}