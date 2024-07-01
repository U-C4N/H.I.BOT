# UMBOT - Elite AI Chatbot

UMBOT is an advanced AI chatbot application that utilizes Gemini and Groq AI models to provide a sophisticated conversational experience. Built with Python Flask, this web application offers a user-friendly interface for interacting with various AI models.

## Features

* Support for multiple AI models including Gemini and Groq
* Image upload and processing capability
* Multi-language support (English, Turkish, Russian, German, Spanish)
* Code syntax highlighting in chat responses
* Temperature adjustment for AI responses
* Modern and responsive user interface

## Installation

Follow these steps to run UMBOT on your local machine:

1. Clone the repository:

```bash
git clone https://github.com/U-C4N/UMBOT.git
cd UMBOT
```

2. Create and activate a virtual Python environment:

```bash
python -m venv venv
source venv/bin/activate  # For Windows: venv\Scripts\activate
```

3. Install the required packages:

```bash
pip install -r requirements.txt
```

4. Set up your configuration:
   Edit the `config.json` file in the root directory and add your API keys:

```json
{
  "gemini_api_key": "your_gemini_api_key_here",
  "groq_api_key": "your_groq_api_key_here",
  ...
}
```

5. Run the application:

```bash
python app.py
```

6. Open your browser and go to `http://127.0.0.1:5000/` to start using UMBOT.

## Usage

1. Select your preferred language from the dropdown menu.
2. Choose an AI model from the available options (Gemini or Groq models).
3. Type your message in the input field or upload an image for image-based queries.
4. Adjust the temperature slider if desired to control the randomness of the AI's responses.
5. Click the send button or press Enter to submit your query.
6. View the AI's response in the chat window.

## Supported Models

### Gemini Models
- gemini-1.5-pro
- gemini-1.5-flash

### Groq Models
- gemma-7b-it
- llama3-70b-8192
- llama3-8b-8192
- mixtral-8x7b-32768

## Acknowledgments

* Flask - Web framework
* Gemini API - AI model provider
* Groq API - AI model provider
* Tailwind CSS - CSS framework
* Prism.js - Syntax highlighting library

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created by [U-C4N](https://github.com/U-C4N)
