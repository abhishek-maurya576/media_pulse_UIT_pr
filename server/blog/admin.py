"""Blog admin registration."""

from django.contrib import admin
from .models import BlogPost


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'views_count', 'published_at', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'content', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author', 'last_edited_by']
    ordering = ['-created_at']
