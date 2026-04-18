"""
Custom DRF permission classes for Media Pulse RBAC.

Wires into User.has_perm_custom() for modular permission-based access control.
"""

from rest_framework.permissions import BasePermission

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


class RequirePermission(BasePermission):
    """Check a specific custom permission string against user role."""

    def __init__(self, perm: str):
        self.perm = perm

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_perm_custom(self.perm)


class IsJournalistOrAbove(BasePermission):
    """Journalist, Editor, Admin, or SuperAdmin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_journalist


class IsEditorOrAbove(BasePermission):
    """Editor, Admin, or SuperAdmin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_editor


class IsAdminOrAbove(BasePermission):
    """Admin or SuperAdmin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_admin_user


class IsSuperAdmin(BasePermission):
    """SuperAdmin only."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'SUPERADMIN'


class IsOwnerOrEditor(BasePermission):
    """
    Object-level: owner can modify, Editor+ can modify anything.
    Used for Edition (created_by) and Article (author).
    """

    owner_field = 'created_by'

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_editor:
            return True
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user


class IsArticleOwnerOrEditor(IsOwnerOrEditor):
    """Article-specific: checks author field."""
    owner_field = 'author'


class ReadOnlyOrJournalist(BasePermission):
    """
    Authenticated users can read. Journalist+ can write.
    Used for editions — Journalist sees all read-only but writes own.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_journalist


class ReadAllWriteEditor(BasePermission):
    """Authenticated read, Editor+ write. For categories."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_editor


class ReadAllWriteAdmin(BasePermission):
    """Authenticated read, Admin+ write. For templates."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_admin_user
