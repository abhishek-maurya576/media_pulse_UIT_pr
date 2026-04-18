import os
import json
import re
from django.core.exceptions import ValidationError
from django.conf import settings

def load_reserved_usernames():
    """Load reserved usernames from the JSON file at the project root."""
    try:
        # Go up from accounts/validators.py -> server/ -> media_pulse/
        # Or just use settings.BASE_DIR and go up one level.
        # settings.BASE_DIR usually points to 'e:\amit_project\media_pulse\server'
        base_dir = getattr(settings, 'BASE_DIR', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        # The JSON file is now in the server root
        json_path = os.path.join(base_dir, 'reserved_username.json')

            
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('reserved_usernames', []))
    except Exception as e:
        # Fallback minimal list if file cannot be read
        return {'admin', 'superadmin', 'root', 'system', 'mediapulse'}

RESERVED_USERNAMES = load_reserved_usernames()

# Strict forbidden prefixes
RESERVED_PREFIXES = (
    'admin', 'system', 'official', 'support', 'team', 
    'staff', 'root', 'security', 'moderator'
)

# Strict forbidden suffixes
RESERVED_SUFFIXES = (
    'admin', 'official', 'team', 'support'
)

def normalize_username(username):
    """Convert to lowercase and remove non-alphanumeric characters for comparison."""
    return re.sub(r'[^a-z0-9]', '', username.lower())

def validate_username(username):
    """
    Validates that a username is not reserved, not containing bad characters,
    and adheres to length constraints.
    Raises Django ValidationError if invalid.
    """
    if not username:
        raise ValidationError('Username cannot be empty.')
        
    # 1. Length Constraints
    if len(username) < 3:
        raise ValidationError('Username must be at least 3 characters long.')
    if len(username) > 30:
        raise ValidationError('Username cannot exceed 30 characters.')
        
    # 2. Blocked Characters (Only allow letters, numbers, underscore, dot)
    if not re.match(r'^[a-zA-Z0-9_\.]+$', username):
        raise ValidationError('Username can only contain letters, numbers, underscores, and dots.')
        
    # 3. Normalization Rules
    norm = normalize_username(username)
    
    # 4. Core Reserved Usernames
    if norm in RESERVED_USERNAMES:
        raise ValidationError('This username is reserved and cannot be used.')
        
    # 5. Prefix-based Blocking
    if norm.startswith(RESERVED_PREFIXES):
        raise ValidationError('This username uses a reserved prefix and cannot be used.')
        
    # 6. Suffix-based Blocking
    if norm.endswith(RESERVED_SUFFIXES):
        raise ValidationError('This username uses a reserved suffix and cannot be used.')
        
    return username
