const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const modelSelect = document.getElementById('model-select');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const fileUpload = document.getElementById('file-upload');
const websearchToggle = document.getElementById('websearch-toggle');
const clearBtn = document.getElementById('clear-btn');
const statsBtn = document.getElementById('stats-btn');
const statsModal = document.getElementById('stats-modal');
const closeStatsBtn = document.getElementById('close-stats');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const screenshotBtn = document.getElementById('screenshot-btn');

let currentImageFilename = null;

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    loadApiKeys();
});
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
saveSettingsBtn.addEventListener('click', saveSettings);
fileUpload.addEventListener('change', uploadImage);
clearBtn.addEventListener('click', clearChat);
statsBtn.addEventListener('click', showStats);
closeStatsBtn.addEventListener('click', () => statsModal.classList.add('hidden'));
screenshotBtn.addEventListener('click', takeScreenshot);

function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;

    addMessage('user', message);
    userInput.value = '';

    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: message,
            model: modelSelect.value,
            use_websearch: websearchToggle.checked,
            image_filename: currentImageFilename
        })
    })
    .then(response => response.json())
    .then(data => {
        addMessage('bot', data.message);
        addMetrics(data.model, data.response_time, data.token_count);
        currentImageFilename = null;
        progressContainer.classList.add('hidden');
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage('bot', 'An error occurred while processing your request.');
        progressContainer.classList.add('hidden');
    });
}

function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = `p-3 rounded-lg ${sender === 'user' ? 'bg-blue-100 text-blue-800 ml-auto' : 'bg-gray-100 text-gray-800'}`;
    messageElement.style.maxWidth = '70%';
    
    // Bold yerine ** kullanımını değiştir
    message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Kod bloklarını işle
    const codeBlocks = message.match(/```[\s\S]*?```/g) || [];
    codeBlocks.forEach((block, index) => {
        const language = block.match(/```(\w+)/)?.[1] || 'plaintext';
        const code = block.replace(/```(\w+)?/, '').replace(/```$/, '').trim();
        const formattedBlock = `<pre><code class="language-${language}">${code}</code></pre>`;
        message = message.replace(block, `<div class="code-block" id="code-block-${index}">${formattedBlock}</div>`);
    });

    messageElement.innerHTML = message;
    
    // Kod bloklarına kopyalama ve terminal butonu ekle
    codeBlocks.forEach((_, index) => {
        const codeBlockElement = messageElement.querySelector(`#code-block-${index}`);
        if (codeBlockElement) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';

            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy';
            copyButton.className = 'copy-btn';
            copyButton.onclick = function() {
                const codeElement = codeBlockElement.querySelector('code');
                navigator.clipboard.writeText(codeElement.textContent).then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
                });
            };

            const terminalButton = document.createElement('button');
            terminalButton.innerHTML = '&#128187;'; // Terminal ikonu
            terminalButton.className = 'terminal-btn';
            terminalButton.onclick = function() {
                const codeElement = codeBlockElement.querySelector('code');
                const code = codeElement.textContent;
                runPythonCode(code);
            };

            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(terminalButton);
            codeBlockElement.appendChild(buttonContainer);
        }
    });
    
    if (sender === 'bot') {
        const copyIcon = document.createElement('span');
        copyIcon.innerHTML = '&#128203;';
        copyIcon.className = 'copy-icon';
        copyIcon.onclick = function() {
            navigator.clipboard.writeText(message).then(() => {
                alert('Message copied to clipboard!');
            });
        };
        messageElement.appendChild(copyIcon);
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (sender === 'bot') {
        Prism.highlightAll();
    }
}

function addMetrics(model, responseTime, tokenCount) {
    const metricsElement = document.createElement('div');
    metricsElement.className = 'text-xs text-gray-500 mt-1';
    metricsElement.textContent = `Model: ${model} | Response time: ${responseTime.toFixed(2)}s | Tokens: ${tokenCount}`;
    chatMessages.appendChild(metricsElement);
}

function uploadImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    fetch('/upload_image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentImageFilename = data.filename;
            addMessage('bot', `Image uploaded: ${data.filename}. You can now analyze it by sending a prompt.`);
            const imgElement = document.createElement('img');
            imgElement.src = data.file_url;
            imgElement.alt = data.filename;
            imgElement.className = 'mt-2 max-w-full h-auto';
            chatMessages.appendChild(imgElement);
        } else {
            addMessage('bot', `Error: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage('bot', 'An error occurred while uploading the image.');
    });
}

function loadApiKeys() {
    fetch('/get_api_keys')
        .then(response => response.json())
        .then(data => {
            document.getElementById('tavily-key').value = data.TAVILY_API_KEY;
            document.getElementById('gemini-key').value = data.GEMINI_API_KEY;
            document.getElementById('openai-key').value = data.OPENAI_API_KEY;
            document.getElementById('groq-key').value = data.GROQ_API_KEY;
        })
        .catch(error => console.error('Error loading API keys:', error));
}

function saveSettings() {
    const geminiKey = document.getElementById('gemini-key').value;
    const openaiKey = document.getElementById('openai-key').value;
    const tavilyKey = document.getElementById('tavily-key').value;
    const groqKey = document.getElementById('groq-key').value;

    updateApiKey('GEMINI_API_KEY', geminiKey);
    updateApiKey('OPENAI_API_KEY', openaiKey);
    updateApiKey('TAVILY_API_KEY', tavilyKey);
    updateApiKey('GROQ_API_KEY', groqKey);

    settingsModal.classList.add('hidden');
}

function updateApiKey(apiType, apiKey) {
    fetch('/update_api_key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_type: apiType,
            api_key: apiKey
        })
    })
    .then(response => response.json())
    .then(data => console.log(data.message))
    .catch(error => console.error('Error updating API key:', error));
}

function clearChat() {
    chatMessages.innerHTML = '';
    currentImageFilename = null;
}

function showStats() {
    fetch('/get_stats')
    .then(response => response.json())
    .then(data => {
        if (data.length === 0) {
            alert('No statistics available yet. Try chatting with the bot first.');
            return;
        }

        const modelStats = {};
        const dateStats = {};

        data.forEach(item => {
            if (!modelStats[item.model]) {
                modelStats[item.model] = {
                    count: 0,
                    totalTokens: 0,
                    totalResponseTime: 0,
                    responseTimes: []
                };
            }
            modelStats[item.model].count++;
            modelStats[item.model].totalTokens += item.token_count;
            modelStats[item.model].totalResponseTime += item.response_time;
            modelStats[item.model].responseTimes.push(item.response_time);

            const date = new Date(item.timestamp * 1000).toDateString();
            if (!dateStats[date]) {
                dateStats[date] = {
                    count: 0,
                    totalTokens: 0
                };
            }
            dateStats[date].count++;
            dateStats[date].totalTokens += item.token_count;
        });

        // Model kullanım istatistikleri
        const modelUsageData = Object.entries(modelStats).map(([model, stats]) => ({
            model,
            count: stats.count,
            avgResponseTime: stats.totalResponseTime / stats.count,
            totalTokens: stats.totalTokens
        }));

        // Zaman trendi
        const timeSeriesData = Object.entries(dateStats).map(([date, stats]) => ({
            date,
            count: stats.count,
            totalTokens: stats.totalTokens
        }));

        // Grafikleri oluştur
        createModelUsageChart(modelUsageData);
        createTimeSeriesChart(timeSeriesData);
        createResponseTimeBoxPlot(modelStats);
        createTokenUsageBoxPlot(modelStats);

        statsModal.classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error fetching stats:', error);
        alert('Failed to load statistics. Please check the console for details.');
    });
}

function createModelUsageChart(data) {
    const ctx = document.getElementById('modelUsageChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.model),
            datasets: [
                {
                    label: 'Usage Count',
                    data: data.map(d => d.count),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    yAxisID: 'y-axis-1',
                },
                {
                    label: 'Avg Response Time (s)',
                    data: data.map(d => d.avgResponseTime),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    yAxisID: 'y-axis-2',
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                yAxes: [
                    {
                        id: 'y-axis-1',
                        type: 'linear',
                        position: 'left',
                    },
                    {
                        id: 'y-axis-2',
                        type: 'linear',
                        position: 'right',
                    }
                ]
            },
            title: {
                display: true,
                text: 'Model Usage Statistics'
            }
        }
    });
}

function createTimeSeriesChart(data) {
    const ctx = document.getElementById('timeSeriesChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [
                {
                    label: 'Usage Count',
                    data: data.map(d => d.count),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                    yAxisID: 'y-axis-1',
                },
                {
                    label: 'Total Tokens',
                    data: data.map(d => d.totalTokens),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                    yAxisID: 'y-axis-2',
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                yAxes: [
                    {
                        id: 'y-axis-1',
                        type: 'linear',
                        position: 'left',
                    },
                    {
                        id: 'y-axis-2',
                        type: 'linear',
                        position: 'right',
                    }
                ]
            },
            title: {
                display: true,
                text: 'Usage Trend Over Time'
            }
        }
    });
}

function createResponseTimeBoxPlot(modelStats) {
    const data = Object.entries(modelStats).map(([model, stats]) => ({
        label: model,
        data: stats.responseTimes
    }));

    const ctx = document.getElementById('responseTimeBoxPlot').getContext('2d');
    new Chart(ctx, {
        type: 'boxplot',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Response Time Distribution',
                data: data.map(d => d.data)
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Response Time Distribution by Model'
            }
        }
    });
}

function createTokenUsageBoxPlot(modelStats) {
    const data = Object.entries(modelStats).map(([model, stats]) => ({
        label: model,
        data: [stats.totalTokens / stats.count]  // Average token usage per request
    }));

    const ctx = document.getElementById('tokenUsageBoxPlot').getContext('2d');
    new Chart(ctx, {
        type: 'boxplot',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Token Usage Distribution',
                data: data.map(d => d.data)
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Token Usage Distribution by Model'
            }
        }
    });
}

function takeScreenshot() {
    html2canvas(document.body).then(canvas => {
        const link = document.createElement('a');
        link.download = 'chat.jpg';
        link.href = canvas.toDataURL('image/jpeg');
        link.click();
    }).catch(error => {
        console.error('Screenshot error:', error);
        alert('Failed to take screenshot. Please check the console for details.');
    });
}

function runPythonCode(code) {
    fetch('/run_python', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.output) {
            addMessage('bot', `Python Output:\n\`\`\`\n${data.output}\n\`\`\``);
        } else if (data.error) {
            addMessage('bot', `Error: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        addMessage('bot', 'An error occurred while running the Python code.');
    });
}

// Load model options
fetch('/get_models')
    .then(response => response.json())
    .then(data => {
        for (const [key, value] of Object.entries(data.groq_models)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `⚡ ${value}`;
            modelSelect.appendChild(option);
        }
        data.openai_models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = `🤖 ${model}`;
            modelSelect.appendChild(option);
        });
        data.gemini_models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = `🧠 ${model}`;
            modelSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading model options:', error);
    });