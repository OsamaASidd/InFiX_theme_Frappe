import json
import frappe
from frappe.desk.desktop import get_workspace_sidebar_items, get_desktop_page

@frappe.whitelist()
def get_desktop_pages():
    pages_data = get_workspace_sidebar_items()
    pages = pages_data.get("pages")
    
    hidden_workspaces = []
    pages = [page for page in pages if page.get("title") not in hidden_workspaces]
    original_pages = pages
    
    # Filter for top-level pages
    parent_pages = [d for d in pages if not d.get('parent_page')]
    
    for row in parent_pages:
        # Fetch the custom field from the Workspace DocType
        # row.get("name") matches the Workspace 'name' (ID)
        row["custom_animated_icon"] = frappe.db.get_value("Workspace", row.get("name"), "custom_animated_icon")
        
        row_json = json.dumps(row, default=str)
        desktop_page = get_desktop_page(row_json)
        
        row["cards"] = desktop_page.get("cards")
        
        # Handle children and fetch their icons as well
        children = [d for d in original_pages if d.get('parent_page') == row.get("name")]
        for child in children:
            child["custom_animated_icon"] = frappe.db.get_value("Workspace", child.get("name"), "custom_animated_icon")
            
        row["child_workspace"] = children
        
    return parent_pages