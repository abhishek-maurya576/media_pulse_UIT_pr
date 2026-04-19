"""
Custom User model for Media Pulse with role-based access control.

Roles: READER, JOURNALIST, EDITOR, ADMIN, SUPERADMIN
Statuses: ACTIVE, SUSPENDED, BANNED, DELETED
Permission-based modular RBAC as specified in RBAC.md.
"""

from django.contrib.auth.models import AbstractUser, UserManager as BaseUserManager
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from .validators import validate_username

import uuid


# ─── Role Hierarchy (index = rank) ───
ROLE_HIERARCHY = ['READER', 'JOURNALIST', 'EDITOR', 'ADMIN', 'SUPERADMIN']


class UserRole(models.TextChoices):
    READER = 'READER', 'Registered Reader'
    JOURNALIST = 'JOURNALIST', 'Journalist / Author'
    EDITOR = 'EDITOR', 'Editor'
    ADMIN = 'ADMIN', 'Admin'
    SUPERADMIN = 'SUPERADMIN', 'Super Admin'


class UserStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    SUSPENDED = 'suspended', 'Suspended'
    BANNED = 'banned', 'Banned'
    DELETED = 'deleted', 'Deleted'


class UserManager(BaseUserManager):
    """Custom manager to assign SUPERADMIN role when creating superusers."""

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.SUPERADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Custom user with role, status, and profile fields."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.READER,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=UserStatus.choices,
        default=UserStatus.ACTIVE,
        db_index=True,
    )
    status_reason = models.CharField(
        max_length=300,
        blank=True,
        default='',
        help_text='Reason for suspension/ban',
    )
    status_changed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_users',
        help_text='Admin/SuperAdmin who created this user',
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

    def save(self, *args, **kwargs):
        # Sync is_active with status so Django's built-in auth checks work
        self.is_active = self.status == UserStatus.ACTIVE
        super().save(*args, **kwargs)

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
    def role_rank(self):
        """Numeric rank for role hierarchy comparison."""
        try:
            return ROLE_HIERARCHY.index(self.role)
        except ValueError:
            return -1

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


class AuditLog(models.Model):
    """
    Tracks all admin actions for accountability.
    Every user management action is recorded here.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_actions',
        help_text='The admin who performed the action',
    )
    action = models.CharField(
        max_length=50,
        db_index=True,
        help_text='Action type: user.created, role.changed, user.suspended, etc.',
    )
    target_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_events',
        help_text='The user the action was performed on',
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Action-specific data: old_role, new_role, reason, ip_address, etc.',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'accounts_auditlog'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor', '-created_at']),
            models.Index(fields=['target_user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]

    def __str__(self):
        actor_name = self.actor.username if self.actor else 'System'
        target_name = self.target_user.username if self.target_user else 'Unknown'
        return f'{actor_name} → {self.action} → {target_name}'

    @classmethod
    def log(cls, actor, action, target_user=None, request=None, **extra_meta):
        """Convenience method to create an audit log entry."""
        metadata = dict(extra_meta)
        if request:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            if not ip:
                ip = request.META.get('REMOTE_ADDR', '')
            metadata['ip_address'] = ip
        return cls.objects.create(
            actor=actor,
            action=action,
            target_user=target_user,
            metadata=metadata,
        )
