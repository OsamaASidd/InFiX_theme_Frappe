import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_install():
    create_custom_fields({
        "Workspace": [
            {
                "fieldname": "custom_animated_icon",
                "label": "Animated Icon",
                "fieldtype": "Data",
                "insert_after": "icon",
                "description": "Iconify icon code (e.g. mdi:home)"
            }
        ]
    })
    
def after_migrate():
    after_install()
