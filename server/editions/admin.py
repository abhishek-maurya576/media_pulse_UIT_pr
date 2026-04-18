"""Django admin registration for editions models."""

from django.contrib import admin
from .models import Edition, Article, Category, Template, PDFGenerationJob


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_order', 'page_number']
    list_editable = ['display_order', 'page_number']
    ordering = ['page_number', 'display_order']


class ArticleInline(admin.TabularInline):
    model = Article
    extra = 0
    fields = ['headline', 'priority', 'content_format', 'category', 'order']
    readonly_fields = []
    show_change_link = True


@admin.register(Edition)
class EditionAdmin(admin.ModelAdmin):
    list_display = ['name', 'newspaper_name', 'edition_number', 'publication_date', 'status', 'article_count']
    list_filter = ['status', 'page_size', 'style_preset']
    search_fields = ['name', 'newspaper_name']
    date_hierarchy = 'publication_date'
    inlines = [ArticleInline]

    def article_count(self, obj):
        return obj.articles.count()
    article_count.short_description = 'Articles'


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['headline', 'edition', 'priority', 'content_format', 'category', 'order']
    list_filter = ['priority', 'content_format', 'category']
    search_fields = ['headline', 'subheadline', 'content_raw']
    raw_id_fields = ['edition']


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']


@admin.register(PDFGenerationJob)
class PDFGenerationJobAdmin(admin.ModelAdmin):
    list_display = ['edition', 'status', 'progress_percent', 'started_at', 'completed_at']
    list_filter = ['status']
    readonly_fields = ['started_at', 'completed_at']
