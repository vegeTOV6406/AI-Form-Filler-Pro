// Сервис для работы с AI API
async function generateAIResponse(question, promptTemplate, aiSettings, profile) {
  // Получаем текст резюме, настройки стиля и уровень креативности
  const { resumeText, responseStyle, creativityLevel } = await new Promise(resolve => {
    chrome.storage.local.get(['resumeText', 'responseStyle', 'creativityLevel'], resolve);
  });
  
  // Находим релевантные разделы резюме
  const relevantSections = await findRelevantSections(question, resumeText);
  
  // Определяем, есть ли в резюме релевантная информация по вопросу
  const hasRelevantInfo = relevantSections.length > 0;
  
  // Формируем replacements
  const replacements = {
    '{question}': question,
    '{full_name}': profile?.personal?.full_name || '',
    '{email}': profile?.personal?.email || '',
    '{phone}': profile?.personal?.phone || '',
    '{city}': profile?.personal?.city || '',
    '{telegram}': profile?.personal?.telegram || '',
    '{linkedin}': profile?.personal?.linkedin || '',
    '{github}': profile?.personal?.github || '',
    '{resume_url}': profile?.personal?.resume_url || '',
    '{role}': profile?.professional?.role || '',
    '{strengths}': profile?.professional?.strengths || '',
    '{skills}': profile?.professional?.skills || '',
    '{resume_text}': hasRelevantInfo ? relevantSections.join('\n\n') : '',
    '{has_relevant_info}': hasRelevantInfo ? 'да' : 'нет'
  };
  
  let userPrompt = promptTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    userPrompt = userPrompt.replace(new RegExp(escapedKey, 'g'), value);
  }
  
  // Улучшенные инструкции для ИИ с учетом креативности
  const systemInstruction = hasRelevantInfo 
    ? `Ты помогаешь кандидату отвечать на вопросы. Отвечай ТОЛЬКО на поставленный вопрос, используя информацию из резюме только если она прямо относится к вопросу. Не упоминай информацию из резюме, если она не имеет прямого отношения к вопросу. Будь конкретным и избегай общих фраз. Для общих вопросов можешь быть более креативным.`
    : `Ты помогаешь кандидату отвечать на вопросы. Так как в резюме нет точной информации по этому вопросу, дай правдоподобный ответ, который соответствует профилю. Будь конкретным и избегай общих фраз. Отвечай естественно, как живой человек. Для общих вопросов можно быть более креативным.`;
  
  let aiResponse;
  try {
    // Добавляем уровень креативности (температуру) в настройки
    const aiSettingsWithTemperature = {
      ...aiSettings,
      temperature: parseFloat(creativityLevel) || 0.7
    };
    
    switch (aiSettingsWithTemperature.provider) {
      case 'openai': 
        aiResponse = await callOpenAI(systemInstruction, userPrompt, aiSettingsWithTemperature);
        break;
      case 'gemini': 
        aiResponse = await callGemini(systemInstruction, userPrompt, aiSettingsWithTemperature);
        break;
      case 'anthropic': 
        aiResponse = await callAnthropic(systemInstruction, userPrompt, aiSettingsWithTemperature);
        break;
      case 'aitunnel': 
        aiResponse = await callAITunnel(systemInstruction, userPrompt, aiSettingsWithTemperature);
        break;
      case 'bothub': 
        aiResponse = await callBothub(systemInstruction, userPrompt, aiSettingsWithTemperature);
        break;
      case 'local': 
        aiResponse = await callLocal(systemInstruction, userPrompt, aiSettingsWithTemperature);
        break;
      default: 
        throw new Error('Неизвестный провайдер AI');
    }
  } catch (error) {
    console.error('Ошибка при вызове AI:', error);
    // Fallback: используем простой ответ без привязки к резюме
    aiResponse = await generateFallbackResponse(question, profile);
  }
  
  // Пост-обработка ответа для естественности
  return humanizeAIResponse(aiResponse, responseStyle || 'professional');
}

// Резервный ответ, если AI не доступен или произошла ошибка
async function generateFallbackResponse(question, profile) {
  // Простой ответ, основанный на профессиональных данных
  const role = profile?.professional?.role || 'специалист';
  const skills = profile?.professional?.skills || '';
  
  // Определяем тему вопроса
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('опыт') || questionLower.includes('работал')) {
    return `Имею опыт работы в области ${role}. ${skills ? `Владею: ${skills}.` : ''}`;
  } else if (questionLower.includes('навык') || questionLower.includes('умение')) {
    return skills || `Владею необходимыми навыками для позиции ${role}.`;
  } else if (questionLower.includes('образование') || questionLower.includes('учеб')) {
    return `Имею образование, соответствующее требованиям позиции ${role}.`;
  }
  
  // Общий ответ
  return `Готов ответить на ваш вопрос относительно позиции ${role}.`;
}

async function callApi(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = await response.text();
        }
        console.error("API Error Body:", errorBody);
        throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function callGemini(systemInstruction, userPrompt, settings) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
  const data = await callApi(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: settings.temperature || 0.7
      }
    })
  });
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAI(systemInstruction, userPrompt, settings) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const data = await callApi(url, {
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
      temperature: settings.temperature || 0.7,
      max_tokens: 150
    })
  });
  return data.choices[0].message.content;
}

async function callAnthropic(systemInstruction, userPrompt, settings) {
  const url = 'https://api.anthropic.com/v1/messages';
  const data = await callApi(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemInstruction,
      temperature: settings.temperature || 0.7
    })
  });
  return data.content[0].text;
}

async function callAITunnel(systemInstruction, userPrompt, settings) {
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
    const url = "https://api.aitunnel.ru/v1/chat/completions";
    const data = await callApi(url, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [{ role: "user", content: fullPrompt }],
            temperature: settings.temperature || 0.7,
            max_tokens: 150
        })
    });
    return data.choices[0].message.content;
}

async function callBothub(systemInstruction, userPrompt, settings) {
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
    const url = "https://api.bothub.chat/api/v1/chat/completions";
    const data = await callApi(url, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [{ role: "user", content: fullPrompt }],
            temperature: settings.temperature || 0.7,
            max_tokens: 150
        })
    });
    return data.choices[0].message.content;
}

async function callLocal(systemInstruction, userPrompt, settings) {
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
    const baseUrl = settings.baseUrl || 'http://localhost:11434/v1/';
    const url = `${baseUrl}chat/completions`;
    const data = await callApi(url, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey || 'ollama'}`
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [{ role: "user", content: fullPrompt }],
            temperature: settings.temperature || 0.7,
            stream: false
        })
    });
    return data.choices[0].message.content;
}