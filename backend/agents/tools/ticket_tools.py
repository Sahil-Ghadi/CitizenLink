import os
import requests
from typing import Any, Dict
from langchain_core.tools import tool

# Assuming the backend API URL is provided via environment variables, with a fallback.
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")


@tool
def get_ticket(ticket_id: str) -> Dict[str, Any]:
    """
    Retrieve ticket details from the backend CRUD API.
    
    Args:
        ticket_id: The ID of the ticket to retrieve.
    """
    try:
        response = requests.get(f"{API_BASE_URL}/tickets/{ticket_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": f"Failed to retrieve ticket: {str(e)}"}


@tool
def update_ticket(ticket_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update ticket details via the backend CRUD API.
    
    Args:
        ticket_id: The ID of the ticket to update.
        data: A dictionary of key-value pairs to update.
    """
    try:
        response = requests.patch(f"{API_BASE_URL}/tickets/{ticket_id}", json=data)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": f"Failed to update ticket: {str(e)}"}


@tool
def assign_agent(ticket_id: str, department: str) -> Dict[str, Any]:
    """
    Assign a ticket to a specific department or human agent.
    
    Args:
        ticket_id: The ID of the ticket to assign.
        department: The department to assign the ticket to.
    """
    try:
        response = requests.post(
            f"{API_BASE_URL}/tickets/{ticket_id}/assign",
            json={"department": department}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": f"Failed to assign ticket: {str(e)}"}
