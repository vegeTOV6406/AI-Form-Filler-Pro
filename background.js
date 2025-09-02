// Обработчик для кнопки в расширении
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs.length > 0) {
        sendMessageWithRetry(tabs[0].id, 0);
      }
    });
  }
  
  // Обработка сообщения о завершении заполнения
  if (request.action === 'fillingComplete') {
    console.log('Заполнение формы завершено');
  }
});

// Функция отправки сообщения с повторными попытками
function sendMessageWithRetry(tabId, attempt) {
  if (attempt >= 5) {
    console.error('Превышено максимальное количество попыток (5)');
    // Отправляем уведомление об ошибке
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Ошибка заполнения формы',
      message: 'Не удалось подключиться к странице. Попробуйте перезагрузить страницу и повторить попытку.'
    });
    return;
  }
  
  chrome.tabs.sendMessage(tabId, { action: 'fillForm' }, response => {
    if (chrome.runtime.lastError) {
      console.warn(`Попытка ${attempt + 1} не удалась: ${chrome.runtime.lastError.message}`);
      
      setTimeout(() => {
        sendMessageWithRetry(tabId, attempt + 1);
      }, 2000);
    }
  });
}

// Проверка и инициализация хранилища при установке
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['prompt', 'aiSettings'], (data) => {
    // Установка промпта по умолчанию, если его нет
    if (!data.prompt) {
      const defaultPrompt = `Ты помогаешь кандидату отвечать на вопросы анкет. Отвечай ТОЛЬКО на поставленный вопрос.

### Контекст из резюме (используй только если это прямо относится к вопросу):
{resume_text}

### Информация обо мне:
- Должность: {role}
- Навыки: {skills}
- Сильные стороны: {strengths}

### Важные правила:
1. Отвечай строго на поставленный вопрос
2. Используй информацию из резюме ТОЛЬКО если она прямо относится к вопросу
3. Если информация из резюме не относится к вопросу - не упоминай её
4. Будь конкретным и избегай общих фраз
5. Отвечай кратко (1-3 предложения)
6. Говори от первого лица
7. Для общих вопросов (не о профессиональных навыках) будь более креативным и естественным

### Вопрос:
{question}

### Ответ:
`;
      chrome.storage.local.set({ prompt: defaultPrompt });
    }

    // Предупреждение о безопасности API ключей
    if (data.aiSettings && data.aiSettings.apiKey) {
      console.warn('API ключ сохранён локально. Для повышенной безопасности рассмотрите использование внешнего прокси.');
    }
  });
});