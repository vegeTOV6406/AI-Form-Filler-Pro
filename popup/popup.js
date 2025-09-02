document.addEventListener('DOMContentLoaded', () => {
  // Модели для провайдеров
  const AI_MODELS = {
    gemini: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-pro"],
    openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    anthropic: ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229"],
    aitunnel: ["gpt-5-nano", "gpt-5-mini", "gpt-5", "gpt-4.1-nano", "gpt-4.1-mini", "gpt-4.1", "gemini-2.5-flash-lite", "gemini-2.5-flash", "deepseek-chat-v3-0324"],
    bothub: ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet", "gemini-1.5-pro", "custom-model"],
    local: ["gpt-oss:20b", "llama3", "mistral"]
  };

// УЛУЧШЕННЫЙ ПРОМПТ ДЛЯ ЛУЧШЕЙ РЕЛЕВАНТНОСТИ И КРЕАТИВНОСТИ
const DEFAULT_PROMPT = `Ты помогаешь кандидату отвечать на вопросы анкет. Отвечай ТОЛЬКО на поставленный вопрос.

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

  // Элементы DOM
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Переключение вкладок
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
  });

  // Обработчик изменения провайдера
  document.getElementById('ai-provider').addEventListener('change', (e) => {
    const provider = e.target.value;
    const modelSelect = document.getElementById('ai-model');
    const baseUrlGroup = document.getElementById('base-url-group');
    
    // Очищаем и заполняем модели
    modelSelect.innerHTML = '';
    AI_MODELS[provider].forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
    
    // Показываем/скрываем поле для URL
    baseUrlGroup.style.display = provider === 'local' ? 'block' : 'none';
  });

  // Обновление значения креативности
  document.getElementById('creativity-level').addEventListener('input', (e) => {
    document.getElementById('creativity-value').textContent = e.target.value;
  });

  // Загрузка сохраненных данных
  chrome.storage.local.get(['profile', 'prompt', 'aiSettings', 'resumeText', 'responseStyle', 'creativityLevel'], (data) => {
    // Резюме
    if (data.resumeText) {
      document.getElementById('resume-text').value = data.resumeText;
    }
    
    // Профиль
    if (data.profile) {
      Object.keys(data.profile.personal).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = data.profile.personal[key] || '';
      });
      
      Object.keys(data.profile.professional).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = data.profile.professional[key] || '';
      });
    }
    
    // Промпт (используем DEFAULT_PROMPT если нет сохраненного)
    document.getElementById('prompt-template').value = data.prompt || DEFAULT_PROMPT;
    
    // Настройки AI
    if (data.aiSettings) {
      document.getElementById('ai-provider').value = data.aiSettings.provider || 'gemini';
      document.getElementById('api-key').value = data.aiSettings.apiKey || '';
      
      // Триггерим событие для обновления моделей
      document.getElementById('ai-provider').dispatchEvent(new Event('change'));
      
      if (data.aiSettings.model) {
        document.getElementById('ai-model').value = data.aiSettings.model;
      }
      
      if (data.aiSettings.baseUrl) {
        document.getElementById('base-url').value = data.aiSettings.baseUrl;
      }
    }
    
    // Настройка стиля ответов
    if (data.responseStyle) {
      document.getElementById('response-style').value = data.responseStyle;
    }

    // Уровень креативности
    if (data.creativityLevel) {
      document.getElementById('creativity-level').value = data.creativityLevel;
      document.getElementById('creativity-value').textContent = data.creativityLevel;
    }
  });

  // Сохранение профиля
  document.getElementById('save-profile').addEventListener('click', () => {
    const profile = {
      personal: {
        full_name: document.getElementById('full_name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        city: document.getElementById('city').value,
        resume_url: document.getElementById('resume_url').value,
        linkedin: document.getElementById('linkedin').value,
        github: document.getElementById('github').value,
        telegram: document.getElementById('telegram').value
      },
      professional: {
        role: document.getElementById('role').value,
        strengths: document.getElementById('strengths').value,
        skills: document.getElementById('skills').value
      }
    };

    chrome.storage.local.set({ profile }, () => {
      showStatus('Профиль успешно сохранен!', 'success');
    });
  });

  // Сохранение резюме
  document.getElementById('save-resume').addEventListener('click', () => {
    const resumeText = document.getElementById('resume-text').value;
    chrome.storage.local.set({ resumeText }, () => {
      showStatus('Текст резюме сохранен!', 'success');
    });
  });

  // Сохранение промпта
  document.getElementById('save-prompt').addEventListener('click', () => {
    const prompt = document.getElementById('prompt-template').value;
    chrome.storage.local.set({ prompt }, () => {
      showStatus('Промпт успешно сохранен!', 'success');
    });
  });

  // Сброс промпта к стандартному
  document.getElementById('reset-prompt').addEventListener('click', () => {
    document.getElementById('prompt-template').value = DEFAULT_PROMPT;
    chrome.storage.local.set({ prompt: DEFAULT_PROMPT }, () => {
      showStatus('Стандартный промпт восстановлен!', 'success');
    });
  });

  // Сохранение настроек AI
  document.getElementById('save-ai').addEventListener('click', () => {
    const aiSettings = {
      provider: document.getElementById('ai-provider').value,
      apiKey: document.getElementById('api-key').value,
      model: document.getElementById('ai-model').value
    };
    
    if (aiSettings.provider === 'local') {
      aiSettings.baseUrl = document.getElementById('base-url').value;
    }
    
    chrome.storage.local.set({ aiSettings }, () => {
      showStatus('Настройки AI сохранены!', 'success');
    });
  });

  // Сохранение стиля ответов
  document.getElementById('response-style').addEventListener('change', () => {
    const responseStyle = document.getElementById('response-style').value;
    chrome.storage.local.set({ responseStyle }, () => {
      showStatus('Стиль ответов сохранен!', 'success');
    });
  });

  // Сохранение уровня креативности
  document.getElementById('creativity-level').addEventListener('change', () => {
    const creativityLevel = document.getElementById('creativity-level').value;
    chrome.storage.local.set({ creativityLevel }, () => {
      showStatus('Уровень креативности сохранен!', 'success');
    });
  });

  // Проверка подключения к AI
  document.getElementById('test-ai').addEventListener('click', async () => {
    const aiSettings = {
      provider: document.getElementById('ai-provider').value,
      apiKey: document.getElementById('api-key').value,
      model: document.getElementById('ai-model').value
    };
    
    if (aiSettings.provider === 'local') {
      aiSettings.baseUrl = document.getElementById('base-url').value;
    }
    
    showStatus('Проверка подключения...', 'loading');
    
    try {
      const response = await testAIConnection(aiSettings);
      showStatus('Подключение успешно!', 'success');
    } catch (error) {
      showStatus(`Ошибка: ${error.message}`, 'error');
    }
  });

  // Заполнение формы
  document.getElementById('fill-form').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'fillActiveTab' });
  });

  // Отображение статуса
  function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = type;
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = '';
    }, 3000);
  }
});

// Тест подключения к AI
async function testAIConnection(settings) {
  return new Promise((resolve, reject) => {
    if (!settings.apiKey && settings.provider !== 'local') {
      return reject(new Error('API ключ не указан'));
    }
    
    // Тестовый запрос
    const testPrompt = "Ответь одним словом: 'Работает'";
    const systemInstruction = "Отвечай ТОЛЬКО одним словом без дополнительных объяснений";
    
    switch (settings.provider) {
      case 'gemini':
        callGemini(systemInstruction, testPrompt, settings)
          .then(res => resolve(res))
          .catch(err => reject(err));
        break;
      case 'openai':
        callOpenAI(systemInstruction, testPrompt, settings)
          .then(res => resolve(res))
          .catch(err => reject(err));
        break;
      case 'anthropic':
        callAnthropic(systemInstruction, testPrompt, settings)
          .then(res => resolve(res))
          .catch(err => reject(err));
        break;
      case 'aitunnel':
        callAITunnel(systemInstruction, testPrompt, settings)
          .then(res => resolve(res))
          .catch(err => reject(err));
        break;
      case 'bothub':
        callBothub(systemInstruction, testPrompt, settings)
          .then(res => resolve(res))
          .catch(err => reject(err));
        break;
      case 'local':
        callLocal(systemInstruction, testPrompt, settings)
          .then(res => resolve(res))
          .catch(err => reject(err));
        break;
      default:
        setTimeout(() => {
          resolve('Успешное подключение');
        }, 1000);
    }
  });
}

// Минимальные реализации для теста
async function callGemini(systemInstruction, userPrompt, settings) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [{
        parts: [{ text: userPrompt }]
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка Gemini: ${response.status}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAI(systemInstruction, userPrompt, settings) {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 10
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка OpenAI: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(systemInstruction, userPrompt, settings) {
  // Объединяем инструкцию и промпт
  const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
  
  const url = 'https://api.anthropic.com/v1/messages';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 100,
      messages: [{ role: 'user', content: fullPrompt }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка Anthropic: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function callAITunnel(systemInstruction, userPrompt, settings) {
  // Объединяем инструкцию и промпт
  const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
  
  try {
    const headers = {
      "Authorization": `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    };
    const data = {
      model: settings.model,
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 100
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("https://api.aitunnel.ru/v1/chat/completions", {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AITunnel error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    return responseData.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка при вызове AITunnel:', error);
    throw new Error(`Ошибка AITunnel: ${error.message}`);
  }
}

async function callBothub(systemInstruction, userPrompt, settings) {
  // Объединяем инструкцию и промпт
  const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
  
  try {
    const headers = {
      "Authorization": `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    };
    const data = {
      model: settings.model,
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 100
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("https://api.bothub.chat/api/v1/chat/completions", {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bothub error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    return responseData.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка при вызове Bothub:', error);
    throw new Error(`Ошибка Bothub: ${error.message}`);
  }
}

async function callLocal(systemInstruction, userPrompt, settings) {
  // Объединяем инструкцию и промпт
  const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
  
  try {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey || 'ollama'}`
    };
    const data = {
      model: settings.model,
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      stream: false
    };

    const baseUrl = settings.baseUrl || 'http://localhost:11434/v1/';
    const response = await fetch(`${baseUrl}chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local model error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    return responseData.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка при вызове локальной модели:', error);
    throw new Error(`Ошибка локальной модели: ${error.message}`);
  }
}