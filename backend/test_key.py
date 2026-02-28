import google.generativeai as genai

genai.configure(api_key="AIzaSyCSNtPFXQMJwxMUBiAxKeBi_NtMNrDYopM")
model = genai.GenerativeModel("gemini-2.5-flash")

try:
    response = model.generate_content("Say 'Quota works!'")
    print(response.text.strip())
except Exception as e:
    print(f"ERROR: {e}")
