from rest_framework.permissions import BasePermission


class HasAPIKeyScope(BasePermission):
    def __init__(self, required_scope):
        self.required_scope = required_scope

    def has_permission(self, request, view):
        api_key = getattr(request, "api_key", None)
        if api_key is None:
            return True
        return self.required_scope in api_key.scopes


def require_scope(scope):
    """Factory that returns an instantiated HasAPIKeyScope permission."""

    class ScopedPermission(HasAPIKeyScope):
        def __init__(self):
            super().__init__(scope)

    ScopedPermission.__name__ = f"HasScope_{scope.replace(':', '_')}"
    return ScopedPermission
