import os
import requests
from typing import Dict, Any
from langchain_core.tools import tool

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")


@tool
def send_sms(phone: str, message: str) -> Dict[str, Any]:
    """
    Send an SMS notification to a specified phone number.
    
    Args:
        phone: The recipient's phone number.
        message: The message to send.
    """
    try:
        response = requests.post(
            f"{API_BASE_URL}/notifications/sms",
            json={"phone": phone, "message": message}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": f"Failed to send SMS: {str(e)}"}


@tool
def send_notification(user_id: str, message: str) -> Dict[str, Any]:
    """
    Send an in-app or system notification to a specified user.
    
    Args:
        user_id: The ID of the user to notify.
        message: The notification message content.
    """
    try:
        response = requests.post(
            f"{API_BASE_URL}/notifications/user",
            json={"user_id": user_id, "message": message}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": f"Failed to send notification: {str(e)}"}
