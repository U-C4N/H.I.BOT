from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import time
import requests
from PIL import Image
import io
import base64
import logging

app = Flask(__name__, template_folder='templates')
CORS(app)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

with open('config.json', encoding='utf-8') as config_file:
    config = json.load(config_file)

GEMINI_API_KEY = config['gemini_api_key']
GROQ_API_KEY = config['groq_api_key']

def get_gemini_response(prompt, model, temperature, image_data=None):
    api_url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent"
    headers = {
        "Content-Type": "application/json"
    }
    params = {
        "key": GEMINI_API_KEY
    }
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature
        }
    }
    if image_data:
        data["contents"][0]["parts"].append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": image_data
            }
        })
        model = "gemini-pro-vision"  # Use vision model for images
    try:
        logger.debug(f"Sending request to Gemini API: {json.dumps(data)}")
        response = requests.post(api_url, json=data, headers=headers, params=params)
        response.raise_for_status()
        logger.debug(f"Gemini API response: {response.text}")
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Gemini API: {e}")
        logger.error(f"Response content: {response.text if hasattr(response, 'text') else 'No response text'}")
        return None

def get_groq_response(prompt, model, temperature):
    api_url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }
    data = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature
    }
    try:
        logger.debug(f"Sending request to Groq API: {json.dumps(data)}")
        response = requests.post(api_url, json=data, headers=headers)
        response.raise_for_status()
        logger.debug(f"Groq API response: {response.text}")
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Groq API: {e}")
        logger.error(f"Response content: {response.text if hasattr(response, 'text') else 'No response text'}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_config')
def get_config():
    safe_config = {k: v for k, v in config.items() if k not in ['gemini_api_key', 'groq_api_key']}
    return jsonify(safe_config)

@app.route('/chat', methods=['POST'])
def chat():
    start_time = time.time()
    
    data = request.json
    user_input = data['message']
    selected_model = data['model']
    api = data['api']
    temperature = float(data['temperature'])
    image_data = data.get('image_data')

    logger.info(f"Received chat request: model={selected_model}, api={api}, temperature={temperature}, has_image={bool(image_data)}")

    if image_data:
        response = get_gemini_response(user_input, "gemini-pro-vision", temperature, image_data)
        api = 'gemini'
    elif api == 'gemini':
        response = get_gemini_response(user_input, selected_model, temperature)
    elif api == 'groq':
        response = get_groq_response(user_input, selected_model, temperature)
    else:
        return jsonify({'error': 'Invalid API'}), 400

    if response:
        if api == 'gemini':
            bot_response = response['candidates'][0]['content']['parts'][0]['text']
            total_tokens = len(bot_response.split())  # Approximate token count for Gemini
        elif api == 'groq':
            bot_response = response['choices'][0]['message']['content']
            total_tokens = response['usage']['total_tokens']
    else:
        bot_response = "Sorry, I couldn't generate a response. Please try again."
        total_tokens = 0

    response_time = (time.time() - start_time) * 1000  # Convert to milliseconds

    logger.info(f"Chat response generated: time={response_time:.2f}ms, tokens={total_tokens}")

    return jsonify({
        'response': bot_response,
        'response_time': response_time,
        'total_tokens': total_tokens
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        logger.warning("No file part in the request")
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        logger.warning("No selected file")
        return jsonify({'error': 'No selected file'}), 400
    
    if file and file.filename.split('.')[-1].lower() in ['jpg', 'jpeg', 'png']:
        try:
            img = Image.open(file.stream)
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            logger.info(f"Image uploaded successfully: {file.filename}")
            return jsonify({
                'image_data': img_str,
                'width': img.width,
                'height': img.height
            })
        except Exception as e:
            logger.error(f"Error processing uploaded image: {e}")
            return jsonify({'error': 'Error processing image'}), 500
    else:
        logger.warning(f"Invalid file type: {file.filename}")
        return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    app.run(debug=True)