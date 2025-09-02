// Главный обработчик content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    console.log('Получен запрос на заполнение формы');
    
    // Защита от повторного запуска
    if (!window.formFillingInProgress) {
      window.formFillingInProgress = true;
      fillFormWithAI().finally(() => {
        window.formFillingInProgress = false;
      });
    } else {
      console.log('Заполнение уже в процессе, новый запрос игнорируется');
    }
  }
});

async function fillFormWithAI() {
  try {
    console.log('Начато заполнение формы...');
    
    // Получаем все необходимые настройки
    const { profile, prompt, aiSettings, creativityLevel } = await new Promise(resolve => {
      chrome.storage.local.get(['profile', 'prompt', 'aiSettings', 'creativityLevel'], resolve);
    });

    const host = window.location.host;

    // Передаем creativityLevel в обработчики форм
    if (host.includes('docs.google.com')) {
      await handleGoogleForms(profile, prompt, {...aiSettings, creativityLevel});
    } 
    else if (host.includes('forms.office.com')) {
      await handleMicrosoftForms(profile, prompt, {...aiSettings, creativityLevel});
    }
    else if (host.includes('forms.yandex.ru')) {
      await handleYandexForms(profile, prompt, {...aiSettings, creativityLevel});
    }
    else if (host.includes('hh.ru')) {
      await handleHhRuForm(profile, prompt, {...aiSettings, creativityLevel});
    }
    else {
      await handleGenericForm(profile, prompt, {...aiSettings, creativityLevel});
    }
    
    console.log('Заполнение формы завершено');
    
    // Отправляем сообщение о завершении
    chrome.runtime.sendMessage({ action: 'fillingComplete' });

  } catch (error) {
    console.error("КРИТИЧЕСКАЯ ОШИБКА РАСШИРЕНИЯ:", error);
  }
}