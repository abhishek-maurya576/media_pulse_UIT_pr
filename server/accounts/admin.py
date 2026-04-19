"""Admin configuration for accounts."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'status', 'is_active', 'date_joined']
    list_filter = ['role', 'status', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Media Puls', {'fields': ('role', 'status', 'status_reason', 'status_changed_at', 'avatar', 'bio', 'phone', 'created_by')}),
    )
    readonly_fields = ['status_changed_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['actor', 'action', 'target_user', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['actor__username', 'target_user__username', 'action']
    ordering = ['-created_at']
    readonly_fields = ['id', 'actor', 'action', 'target_user', 'metadata', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
