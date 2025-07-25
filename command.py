import pyttsx3
import speech_recognition as sr
import datetime
import webbrowser
import os
import subprocess
import threading
import time
import requests
import json
import pyautogui
import pygetwindow as gw
import psutil
from urllib.parse import quote_plus
from pygame import mixer
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("xyrix_assistant.log"),
        logging.StreamHandler()
    ]
)

mixer.init()

# DeepInfra API configuration
DEEPINFRA_API_URL = "https://api.deepinfra.com/v1/inference/mistralai/Mistral-7B-Instruct-v0.1"
DEEPINFRA_API_KEY = "TAPQQ7nETqPgXS0ywusYM5tlLxEP3Zog"
DEEPINFRA_HEADERS = {
    "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
    "Content-Type": "application/json"
}


WINDOWS_APPS = {
    'notepad': 'notepad.exe',
    'calculator': 'calc.exe',
    'paint': 'mspaint.exe',
    'word': 'winword.exe',
    'excel': 'excel.exe',
    'powerpoint': 'powerpnt.exe',
    'sticky notes': 'StikyNot.exe',
    'camera': 'Microsoft.WindowsCamera_8wekyb3d8bbwe!App',
    'photos': 'Microsoft.Windows.Photos_8wekyb3d8bbwe!App',
    'store': 'Microsoft.WindowsStore_8wekyb3d8bbwe!App',
    'settings': 'ms-settings:',
    'edge': 'msedge.exe',
    'chrome': 'chrome.exe',
    'wordpad': 'write.exe'
}
# WhatsApp contacts - customize with your own contacts
WHATSAPP_CONTACTS = {
    "Aina" : "+923144224176",
    "Heer Khan" : "+923331617593",
}

# Common WhatsApp paths - UPDATE WITH YOUR PATH
WHATSAPP_PATHS = [
    r"C:\Users\The Affinity Zone\OneDrive\Desktop",
    r"C:\Users\The Affinity Zone\AppData\Local\WhatsApp\WhatsApp.exe",
    r"C:\Program Files\WindowsApps\5319275A.WhatsAppDesktop_2.2405.6.0_x64__cv1g1gvanyjgm\WhatsApp.exe",
    os.path.expanduser(r"~\AppData\Local\WhatsApp\WhatsApp.exe"),
    r"C:\Program Files (x86)\WhatsApp\WhatsApp.exe"
]

# Common WhatsApp window titles
WHATSAPP_TITLES = ["WhatsApp", "WhatsApp Desktop", "WhatsApp™", "WhatsApp Messenger"]

def play_open_sound():
    def play():
        try:
            mixer.music.load("open-sound.wav")
            mixer.music.play()
            while mixer.music.get_busy():
                continue
        except Exception as e:
            logging.error(f"Sound Error: {e}")
    threading.Thread(target=play).start()

def speak(text):
    try:
        engine = pyttsx3.init('sapi5')
        voices = engine.getProperty('voices')
        engine.setProperty('voice', voices[0].id)
        engine.setProperty('rate', 174)
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        logging.error(f"Speech Error: {e}")

def takecommand():
    r = sr.Recognizer()
    try:
        with sr.Microphone() as source:
            logging.info('Listening...')
            r.pause_threshold = 1
            r.adjust_for_ambient_noise(source)
            audio = r.listen(source, timeout=5, phrase_time_limit=5)
            
        logging.info('Recognizing...')
        query = r.recognize_google(audio, language='en-in')
        logging.info(f"User said: {query}")
        return query.lower()
    
    except Exception as e:
        logging.error(f"Recognition Error: {e}")
        return ""

def is_whatsapp_running():
    """Check if WhatsApp process is running"""
    for process in psutil.process_iter(['name']):
        if process.info['name'] and 'whatsapp' in process.info['name'].lower():
            return True
    return False

def open_whatsapp_desktop():
    """Robust WhatsApp opening with multiple fallbacks"""
    try:
        logging.info("Attempting to open WhatsApp...")
        
        # Method 1: Activate existing window
        for title in WHATSAPP_TITLES:
            try:
                apps = gw.getWindowsWithTitle(title)
                if apps:
                    logging.info(f"Found window: {title}")
                    apps[0].activate()
                    time.sleep(2)
                    return True
            except Exception as e:
                logging.warning(f"Window activation error: {e}")
        
        # Method 2: Launch from known paths
        for path in WHATSAPP_PATHS:
            try:
                if os.path.exists(path):
                    logging.info(f"Launching WhatsApp from: {path}")
                    subprocess.Popen(path)
                    time.sleep(8)
                    
                    # Verify it opened
                    if is_whatsapp_running():
                        logging.info("WhatsApp launched successfully")
                        return True
            except Exception as e:
                logging.error(f"Launch error for {path}: {e}")
        
        # Method 3: Try to start via shell command
        try:
            logging.info("Trying shell command...")
            subprocess.run("start whatsapp:", shell=True, check=True)
            time.sleep(8)
            if is_whatsapp_running():
                return True
        except Exception as e:
            logging.error(f"Shell command failed: {e}")
        
        # Method 4: Search in common locations
        common_paths = [
            os.path.join(os.environ["LOCALAPPDATA"], "WhatsApp", "WhatsApp.exe"),
            os.path.join(os.environ["PROGRAMFILES"], "WhatsApp", "WhatsApp.exe"),
            os.path.join(os.environ["PROGRAMFILES(X86)"], "WhatsApp", "WhatsApp.exe")
        ]
        
        for path in common_paths:
            try:
                if os.path.exists(path):
                    logging.info(f"Found WhatsApp at: {path}")
                    subprocess.Popen(path)
                    time.sleep(8)
                    if is_whatsapp_running():
                        return True
            except Exception as e:
                logging.error(f"Error launching from {path}: {e}")
        
        logging.error("All WhatsApp opening methods failed")
        return False
        
    except Exception as e:
        logging.exception("Critical error in open_whatsapp_desktop")
        return False

def send_whatsapp_message(contact_name, message):
    """Send WhatsApp message with robust error handling"""
    try:
        logging.info(f"Preparing to send message to {contact_name}")
        
        if not open_whatsapp_desktop():
            return "Couldn't open WhatsApp. Please make sure WhatsApp Desktop is installed."
        
        # Activate WhatsApp window
        time.sleep(2)
        pyautogui.hotkey('alt', 'tab')  # Ensure WhatsApp is focused
        
        # Start new chat
        time.sleep(1)
        pyautogui.hotkey('ctrl', 'n')
        time.sleep(2.5)
        
        # Enter contact name
        contact = WHATSAPP_CONTACTS.get(contact_name.lower(), contact_name)
        logging.info(f"Searching for contact: {contact}")
        pyautogui.write(contact)
        time.sleep(3)  # Extra time for search results
        
        # Select contact
        pyautogui.press('enter')
        time.sleep(2)
        
        # Type message
        logging.info(f"Sending message: {message}")
        pyautogui.write(message)
        time.sleep(1)
        
        # Send message
        pyautogui.press('enter')
        time.sleep(1)
        
        return f"Message sent to {contact}"
    except Exception as e:
        logging.exception("Error in send_whatsapp_message")
        return f"Failed to send message: {str(e)}"

def call_whatsapp_contact(contact_name):
    """Call contact on WhatsApp with robust error handling"""
    try:
        logging.info(f"Preparing to call {contact_name}")
        
        if not open_whatsapp_desktop():
            return "Couldn't open WhatsApp. Please make sure WhatsApp Desktop is installed."
        
        # Activate WhatsApp window
        time.sleep(2)
        pyautogui.hotkey('alt', 'tab')
        
        # Start new chat
        time.sleep(1)
        pyautogui.hotkey('ctrl', 'n')
        time.sleep(2.5)
        
        # Enter contact name
        contact = WHATSAPP_CONTACTS.get(contact_name.lower(), contact_name)
        logging.info(f"Searching for contact: {contact}")
        pyautogui.write(contact)
        time.sleep(3)
        
        # Select contact
        pyautogui.press('enter')
        time.sleep(2)
        
        # Start call
        logging.info("Starting call")
        pyautogui.hotkey('ctrl', 'p')
        time.sleep(2)  # Wait for call to initiate
        
        return f"Calling {contact} on WhatsApp"
    except Exception as e:
        logging.exception("Error in call_whatsapp_contact")
        return f"Failed to start call: {str(e)}"

def open_youtube():
    play_open_sound()
    webbrowser.open("https://www.youtube.com")
    return "Opening YouTube"

def play_on_youtube(media_name):
    play_open_sound()
    encoded_query = quote_plus(media_name)
    url = f"https://www.youtube.com/results?search_query={encoded_query}"
    webbrowser.open(url)
    return f"Playing {media_name} on YouTube"

def search_on_web(query):
    play_open_sound()
    encoded_query = quote_plus(query)
    url = f"https://www.google.com/search?q={encoded_query}"
    try:
        webbrowser.open(url)
        return f"Searching Google for {query}"
    except Exception as e:
        return f"Failed to search: {str(e)}"

def open_windows_app(app_name):
    play_open_sound()
    app = app_name.lower()
    try:
        if app == 'camera':
            subprocess.run('start microsoft.windows.camera:', shell=True)
            return "Opening Camera"
        elif app == 'sticky notes':
            os.startfile('StikyNot.exe')
            return "Opening Sticky Notes"
        elif app in ['photos', 'store']:
            subprocess.run(f'start shell:appsFolder\\Microsoft.Windows.Photos_8wekyb3d8bbwe!App', shell=True)
            return f"Opening {app_name}"
        elif app == 'word':
            office_path = 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE'
            if os.path.exists(office_path):
                os.startfile(office_path)
                return "Opening Microsoft Word"
            return "Microsoft Word not found"
        elif app in ['edge', 'chrome']:
            os.startfile(f"{app}.exe")
            return f"Opening {app_name}"
        return f"Sorry, I don't know how to open {app_name}"
    except Exception as e:
        return f"Failed to open {app_name}. Error: {str(e)}"

def ask_chatgpt(question):
    """Query the free ChatGPT alternative using DeepInfra API"""
    try:
        # Create the payload
        payload = {
            "input": f"<s>[INST] {question} [/INST]",
            "max_new_tokens": 200,
            "temperature": 0.7,
            "top_p": 0.9,
            "stop": ["</s>"]
        }
        
        # Make the API request
        response = requests.post(
            DEEPINFRA_API_URL, 
            headers=DEEPINFRA_HEADERS, 
            json=payload
        )
        
        # Check for valid response
        if response.status_code == 200:
            result = response.json()
            if 'results' in result and len(result['results']) > 0:
                generated_text = result['results'][0].get('generated_text', '')
                # Clean up the response
                if "[/INST]" in generated_text:
                    generated_text = generated_text.split("[/INST]")[-1]
                return generated_text.strip()
            return "I didn't get a valid response from the AI."
        
        # Handle errors
        error_msg = f"API Error: {response.status_code}"
        if response.text:
            try:
                error_data = response.json()
                error_msg += f" - {error_data.get('error', 'Unknown error')}"
            except:
                error_msg += f" - {response.text[:100]}"
        return error_msg
        
    except Exception as e:
        return f"Error accessing AI service: {str(e)}"

def get_formatted_time():
    """Get current time in 12-hour format with AM/PM"""
    now = datetime.datetime.now()
    # Format time as HH:MM AM/PM
    hour = now.hour
    if hour == 0:
        hour = 12
        period = "AM"
    elif hour < 12:
        period = "AM"
    elif hour == 12:
        period = "PM"
    else:
        hour -= 12
        period = "PM"
    
    return f"{hour}:{now.strftime('%M')} {period}"

def process_query(query):
    if not query:
        return "Please enter a command"
    
    query = query.lower()
    
    # Handle drawing commands
    if any(x in query for x in ['draw', 'sketch']):
        shape = None
        if 'circle' in query:
            shape = 'circle'
        elif 'rectangle' in query or 'square' in query:
            shape = 'rectangle'
        elif 'triangle' in query:
            shape = 'triangle'
        
        if shape:
            return f"Opening drawing canvas to draw a {shape}. Say 'stop drawing' when finished."
        else:
            return "What shape would you like me to draw? I can draw circles, rectangles, or triangles."
    
    if 'stop drawing' in query:
        return "Stopped drawing mode."
    
    # Handle WhatsApp commands
    if 'send whatsapp message to' in query:
        try:
            # Extract contact and message
            parts = query.split('send whatsapp message to', 1)[1].split('saying', 1)
            contact = parts[0].strip()
            message = parts[1].strip()
            return send_whatsapp_message(contact, message)
        except Exception as e:
            return "Couldn't understand the WhatsApp command. Format: 'send whatsapp message to [contact] saying [message]'"
    
    elif 'call' in query and 'on whatsapp' in query:
        try:
            contact = query.split('call', 1)[1].split('on whatsapp', 1)[0].strip()
            return call_whatsapp_contact(contact)
        except Exception as e:
            return "Couldn't understand the call command. Format: 'call [contact] on whatsapp'"
    
    # Handle "on google" searches
    if ' on google' in query:
        # Extract the search term by removing "on google"
        search_term = query.replace(' on google', '').strip()
        
        # Remove question words if they appear at the beginning
        question_words = ['what', 'who', 'when', 'where', 'why', 'how', 'tell me about', 'explain']
        for word in question_words:
            if search_term.startswith(word + ' '):
                search_term = search_term[len(word):].strip()
                break
                
        return search_on_web(search_term)
    
    # Existing commands
    if 'open' in query:
        if 'youtube' in query:
            return open_youtube()
        app_name = query.split('open ', 1)[-1].strip()
        return open_windows_app(app_name)
        
    if any(x in query for x in ['search for', 'search the web for']):
        search_term = query.split('for', 1)[-1].strip()
        return search_on_web(search_term)
        
    if 'play' in query:
        media_name = query.split('play ', 1)[-1].strip()
        if media_name:
            return play_on_youtube(media_name)
        return "Please specify what to play"
        
    if 'time' in query:
        return f"The current time is {get_formatted_time()}"
        
    if 'date' in query:
        return f"Today's date is {datetime.datetime.now().strftime('%d %B %Y')}"
        
    if 'your name' in query:
        return "I am Xyrix, your AI assistant"
    if 'hello' in query:
        return "Hello! I am Xyrix, your AI Assistant. How can I help you?"
    if 'who are you' in query:
        return "I am AI Model,Trained by Aiman Nadeem"
        
    if 'help' in query or 'commands' in query:
        return ("Available commands:\n"
                "• Open [Application Name]\n"
                "• Play [Song/Movie Name]\n"
                "• Search for [Query]\n"
                "• What's the time/date?\n"
                "• Ask any question\n"
                "• [Question] on google → Search on Google\n"
                "• What is/Who is [Topic] → Get AI answer\n"
                "• Send WhatsApp message to [contact] saying [message]\n"
                "• Call [contact] on WhatsApp\n"
                "• Draw [shape] → Open drawing canvas")
    
    # For AI responses to who/what/tell me queries
    question_triggers = ['what', 'who', 'when', 'where', 'why', 'how', 'tell me', 'explain',"give","provide"]
    if any(query.startswith(trigger + ' ') for trigger in question_triggers):
        return ask_chatgpt(query)
    
    # For all other queries, use ChatGPT
    return ask_chatgpt(query)