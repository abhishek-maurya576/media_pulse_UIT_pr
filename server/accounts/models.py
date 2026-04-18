"""
Custom User model for Media Pulse with role-based access control.

Roles: READER, JOURNALIST, EDITOR, ADMIN, SUPERADMIN
Permission-based modular RBAC as specified in RBAC.md.
"""

from django.contrib.auth.models import AbstractUser, UserManager as BaseUserManager
from django.core.exceptions import ValidationError
from django.db import models
from .validators import validate_username

import uuid

class UserRole(models.TextChoices):
    READER = 'READER', 'Registered Reader'
    JOURNALIST = 'JOURNALIST', 'Journalist / Author'
    EDITOR = 'EDITOR', 'Editor'
    ADMIN = 'ADMIN', 'Admin'
    SUPERADMIN = 'SUPERADMIN', 'Super Admin'


class UserManager(BaseUserManager):
    """Custom manager to assign SUPERADMIN role when creating superusers."""

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.SUPERADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Custom user with role and profile fields."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.READER,
        db_index=True,
    )

    objects = UserManager()
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        db_table = 'accounts_user'
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'

    def clean(self):
        super().clean()
        if self.username:
            # Skip validation for SU and existing users who might already have a reserved name (if needed)
            # Actually, simply checking if it's the admin or a superadmin bypasses the check for system accounts.
            if self.is_superuser or self.role == UserRole.SUPERADMIN:
                return
            
            # Use the validator for normal saves
            try:
                validate_username(self.username)
            except ValidationError as e:
                raise ValidationError({'username': e.message if hasattr(e, 'message') else list(e.messages)[0]})

    @property
    def is_journalist(self):
        return self.role in (UserRole.JOURNALIST, UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPERADMIN)

    @property
    def is_editor(self):
        return self.role in (UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPERADMIN)

    @property
    def is_admin_user(self):
        return self.role in (UserRole.ADMIN, UserRole.SUPERADMIN)

    @property
    def permissions(self):
        """Return permission set based on role."""
        role_perms = {
            UserRole.READER: {
                'article.read', 'comment.create', 'bookmark.create',
                'reaction.create', 'user.follow',
            },
            UserRole.JOURNALIST: {
                'article.read', 'article.create', 'article.edit_own',
                'article.submit', 'media.upload', 'analytics.view_own',
                'comment.create', 'bookmark.create', 'reaction.create',
                'user.follow', 'blog.create', 'blog.edit_own',
            },
            UserRole.EDITOR: {
                'article.read', 'article.create', 'article.edit_own',
                'article.edit_any', 'article.publish', 'article.submit',
                'article.review', 'edition.create', 'edition.generate_pdf',
                'category.manage', 'media.upload', 'analytics.view_own',
                'analytics.view_all', 'comment.create', 'bookmark.create',
                'reaction.create', 'user.follow',
                'blog.create', 'blog.edit_own', 'blog.edit_any',
            },
            UserRole.ADMIN: {
                'article.read', 'article.create', 'article.edit_own',
                'article.edit_any', 'article.publish', 'article.submit',
                'article.review', 'edition.create', 'edition.generate_pdf',
                'category.manage', 'template.manage', 'user.manage',
                'media.upload', 'analytics.view_own', 'analytics.view_all',
                'settings.manage', 'comment.create', 'bookmark.create',
                'reaction.create', 'user.follow',
                'blog.create', 'blog.edit_own', 'blog.edit_any',
            },
            UserRole.SUPERADMIN: {'*'},  # All permissions
        }
        return role_perms.get(self.role, set())

    def has_perm_custom(self, perm: str) -> bool:
        """Check if user has a specific custom permission."""
        perms = self.permissions
        return '*' in perms or perm in perms


class Follow(models.Model):
    """User follow relationship. Reader+ can follow."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='following_set',
    )
    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='followers_set',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_follow'
        unique_together = ['follower', 'following']
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.follower.username} follows {self.following.username}'
