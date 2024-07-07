# H.I.BOT

H.I.BOT is a web application that provides an interactive chat experience using various AI models (OpenAI, Gemini, Groq).

## Features

- Switch between different AI models
- Text-based chat
- Image upload and analysis
- Web search integration
- Python code execution
- Statistics and usage graphs
- Screenshot capture

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/U-C4N/H.I.BOT.git
   cd H.I.BOT
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   venv\Scripts\activate  # Windows
   ```

3. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file and add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   TAVILY_API_KEY=your_tavily_api_key
   ```

5. Run the application:
   ```
   python app.py
   ```

6. Go to `http://localhost:5000` in your browser.

## Usage

- Use the dropdown menu to select different AI models.
- Enter your message and click the "Send" button or press Enter.
- Click the paperclip icon to upload an image.
- Activate the "Web Search" toggle to perform web searches.
- To run Python code, enter the code and click the terminal icon.
- Click the "Stats" button to view statistics.
- Click the camera icon to capture a screenshot.

## Security Warning

This application has the capability to execute Python code provided by users on the server side. This can pose potential security risks. Make sure to implement appropriate security measures before using in a production environment.

## Contributing

Pull requests are always welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
