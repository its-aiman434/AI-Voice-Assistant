import eel
from command import takecommand, speak, process_query, send_whatsapp_message, call_whatsapp_contact
from pygame import mixer

# Initialize pygame mixer
mixer.init()

# Initialize Eel with web folder
eel.init('web')

@eel.expose
def take_command():
    return takecommand()

@eel.expose
def get_response(query):
    return process_query(query)

@eel.expose
def speak_response(text):
    speak(text)

# Expose WhatsApp functions to JavaScript
@eel.expose
def send_whatsapp_message(contact, message):
    from command import send_whatsapp_message
    return send_whatsapp_message(contact, message)

@eel.expose
def call_whatsapp_contact(contact):
    from command import call_whatsapp_contact
    return call_whatsapp_contact(contact)

if __name__ == "__main__":
    eel.start('index.html', size=(1200, 800), mode='chrome')