async function handleGoogleForms(profile, prompt, aiSettings) {
  console.log('Обработка Google Forms...');
  
  let questionBlocks = findGoogleFormQuestionBlocks(document);
  if (questionBlocks.length === 0) {
      const frame = document.querySelector('iframe');
      if (frame) {
          try {
              const frameDoc = frame.contentDocument || frame.contentWindow.document;
              questionBlocks = findGoogleFormQuestionBlocks(frameDoc);
          } catch(e) {
              console.error("Ошибка доступа к iframe:", e);
          }
      }
  }

  if (questionBlocks.length === 0) {
    console.error('Блоки вопросов в Google Form не найдены.');
    return;
  }
  
  const tasks = [];
  for (const block of questionBlocks) {
    const questionText = extractQuestionText(block);
    const answerField = findAnswerField(block);

    if (questionText && answerField) {
      tasks.push({ questionText, answerField });
    }
  }

  console.log(`Найдено ${tasks.length} корректных вопросов для заполнения.`);

  for (const [index, task] of tasks.entries()) {
    try {
      console.log(`Обработка вопроса ${index + 1}/${tasks.length}: ${task.questionText.substring(0, 70)}...`);
      
      const aiResponse = await generateAIResponse(
        task.questionText, 
        prompt, 
        aiSettings, // Теперь включает creativityLevel
        profile
      );
      console.log(`AI ответ: ${aiResponse.substring(0, 70)}...`);

      const success = await fillGoogleFormTextField(task.answerField, aiResponse);
      if (!success) {
          console.warn('Не удалось заполнить поле для вопроса:', task.questionText);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Ошибка при обработке вопроса "${task.questionText}":`, error);
    }
  }
}

function findGoogleFormQuestionBlocks(root) {
  return Array.from(root.querySelectorAll('div[role="listitem"], .Qr7Oae'));
}

function extractQuestionText(block) {
  const questionElement = block.querySelector('.M7eMe, .z12JJ');
  if (!questionElement) return null;
  
  let text = questionElement.textContent?.trim() || '';
  if (text.endsWith('*Мой ответ')) {
      text = text.replace(/\*Мой ответ$/, '').trim();
  }
  if (text.includes('Мой ответ')) {
      return null;
  }
  
  return text || null;
}

function findAnswerField(block) {
    return block.querySelector('textarea, input[type="text"], input[type="email"], input[type="number"]');
}

async function fillGoogleFormTextField(field, answer) {
  try {
    const proto = Object.getPrototypeOf(field);
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    nativeInputValueSetter.call(field, answer);

    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('Поле успешно заполнено.');
    return true;
  } catch (e) {
    console.error('Ошибка при заполнении поля Google Form:', e);
    return false;
  }
}