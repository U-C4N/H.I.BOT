from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv
import os
import time
import asyncio
import google.generativeai as genai
import groq
from openai import AsyncOpenAI
from werkzeug.utils import secure_filename
from PIL import Image
import json
from tavily import TavilyClient
import subprocess


app = Flask(__name__)

# Load environment variables
load_dotenv()

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# Initialize API clients
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
groq_client = groq.AsyncGroq(api_key=os.getenv('GROQ_API_KEY'))
openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
tavily_client = TavilyClient(api_key=os.getenv('TAVILY_API_KEY'))

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Model lists
GROQ_MODELS = {
    'llama3-8b-8192': 'LLaMA3 8b',
    'llama3-70b-8192': 'LLaMA3 70b',
    'mixtral-8x7b-32768': 'Mixtral 8x7B',
    'gemma-7b-it': 'Gemma 7b',
    'gemma2-9b-it': 'Gemma2 9b'
}
OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-4']
GEMINI_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash']

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('chat.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/chat', methods=['POST'])
async def chat():
    data = request.json
    user_input = data.get('message')
    selected_model = data.get('model')
    use_websearch = data.get('use_websearch', False)
    image_filename = data.get('image_filename')
    
    start_time = time.time()
    
    try:
        if use_websearch:
            response = await tavily_search(user_input, selected_model)
        elif image_filename:
            response = await process_image(image_filename, user_input)
        elif selected_model in GROQ_MODELS:
            response = await groq_chat(user_input, selected_model)
        elif selected_model in OPENAI_MODELS:
            response = await openai_chat(user_input, selected_model)
        elif selected_model in GEMINI_MODELS:
            response = await gemini_chat(user_input, selected_model)
        else:
            response = "Unsupported model selected."
    except Exception as e:
        response = f"An error occurred: {str(e)}"
    
    end_time = time.time()
    response_time = end_time - start_time
    token_count = len(response.split())
    
    save_stats(selected_model, response_time, token_count)
    
    return jsonify({
        'message': response,
        'response_time': response_time,
        'token_count': token_count,
        'model': selected_model
    })

async def tavily_search(query, model):
    # Implement Tavily search functionality here
    pass

async def process_image(image_filename, prompt):
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
    image = Image.open(image_path)
    model = genai.GenerativeModel('gemini-pro-vision')
    response = await model.generate_content_async([prompt, image])
    return response.text

async def gemini_chat(prompt, model_name):
    model = genai.GenerativeModel(model_name)
    response = await model.generate_content_async(prompt)
    return response.text

async def openai_chat(prompt, model_name):
    response = await openai_client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

async def groq_chat(prompt, model_name):
    chat_completion = await groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=model_name,
    )
    return chat_completion.choices[0].message.content

@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file'}), 400
    
    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({'error': 'No selected image file'}), 400
    
    if image_file and allowed_file(image_file.filename):
        filename = secure_filename(image_file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        with Image.open(image_file) as img:
            img.thumbnail((800, 800))  # Resize to max 800x800
            img.save(file_path, optimize=True, quality=85)
        
        return jsonify({'success': True, 'filename': filename, 'file_url': f'/uploads/{filename}'})
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/update_api_key', methods=['POST'])
def update_api_key():
    data = request.json
    api_key = data.get('api_key')
    api_type = data.get('api_type')
    
    if api_type in ['TAVILY_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY']:
        os.environ[api_type] = api_key
        with open('.env', 'r') as f:
            lines = f.readlines()
        with open('.env', 'w') as f:
            for line in lines:
                if line.startswith(api_type):
                    f.write(f"{api_type}={api_key}\n")
                else:
                    f.write(line)
        return jsonify({'message': f'{api_type} updated successfully'})
    else:
        return jsonify({'error': 'Invalid API key type'}), 400

@app.route('/get_api_keys', methods=['GET'])
def get_api_keys():
    return jsonify({
        'TAVILY_API_KEY': os.getenv('TAVILY_API_KEY', ''),
        'GEMINI_API_KEY': os.getenv('GEMINI_API_KEY', ''),
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY', ''),
        'GROQ_API_KEY': os.getenv('GROQ_API_KEY', '')
    })

@app.route('/get_models', methods=['GET'])
def get_models():
    return jsonify({
        'groq_models': GROQ_MODELS,
        'openai_models': OPENAI_MODELS,
        'gemini_models': GEMINI_MODELS
    })

def save_stats(model, response_time, token_count):
    stats = []
    if os.path.exists('stats.json'):
        with open('stats.json', 'r') as f:
            try:
                stats = json.load(f)
            except json.JSONDecodeError:
                print("Error reading stats.json, creating new file")
    
    stats.append({
        'model': model,
        'response_time': response_time,
        'token_count': token_count,
        'timestamp': time.time()
    })
    
    with open('stats.json', 'w') as f:
        json.dump(stats, f)

@app.route('/get_stats', methods=['GET'])
def get_stats():
    if os.path.exists('stats.json'):
        with open('stats.json', 'r') as f:
            try:
                stats = json.load(f)
                return jsonify(stats)
            except json.JSONDecodeError:
                print("Error reading stats.json")
                return jsonify([])
    else:
        return jsonify([])
@app.route('/run_python', methods=['POST'])
def run_python():
    data = request.json
    code = data.get('code')
    if not code:
        return jsonify({'error': 'No code provided'}), 400

    try:
        # Kodu geçici bir dosyaya yazın
        with open('temp_code.py', 'w') as f:
            f.write(code)

        # Python yorumlayıcısını çalıştırın ve çıktıyı alın
        result = subprocess.run(['python', 'temp_code.py'], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            return jsonify({'output': result.stdout})
        else:
            return jsonify({'error': result.stderr})

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Code execution timed out'}), 408
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Geçici dosyayı silin
        os.remove('temp_code.py')

if __name__ == '__main__':
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)