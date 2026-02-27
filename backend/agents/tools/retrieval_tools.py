import os
import requests
from typing import Dict, Any, List
from langchain_core.tools import tool

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")


@tool
def get_similar_tickets(issue_type: str, department: str) -> List[Dict[str, Any]]:
    """
    Retrieve similar tickets based on issue type and department to provide context.
    
    Args:
        issue_type: The type of issue (e.g., 'pothole', 'street_light').
        department: The relevant department handling the issue.
    """
    try:
        response = requests.get(
            f"{API_BASE_URL}/tickets/search/similar",
            params={"issue_type": issue_type, "department": department}
        )
        response.raise_for_status()
        return response.json().get("tickets", [])
    except requests.RequestException as e:
        return [{"error": f"Failed to retrieve similar tickets: {str(e)}"}]
