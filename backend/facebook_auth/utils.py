import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings


def _get_fernet():
    key = settings.ENCRYPTION_KEY.encode()
    # Derive a valid 32-byte Fernet key from the configured key
    digest = hashlib.sha256(key).digest()
    fernet_key = base64.urlsafe_b64encode(digest)
    return Fernet(fernet_key)


def encrypt_token(token):
    if not token:
        return ""
    f = _get_fernet()
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted):
    if not encrypted:
        return ""
    f = _get_fernet()
    return f.decrypt(encrypted.encode()).decode()
