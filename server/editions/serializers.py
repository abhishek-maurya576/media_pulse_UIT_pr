"""DRF Serializers for editions and articles — with ownership fields."""

from rest_framework import serializers
from .models import Edition, Article, Category, Template, PDFGenerationJob


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'display_order', 'page_number']



class ArticleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'edition', 'author', 'author_name',
            'headline', 'subheadline', 'byline',
            'content_raw', 'content_format', 'content_parsed', 'status',
            'category', 'category_name', 'priority',
            'highlights', 'highlights_mode',
            'image', 'image_caption', 'order',
            'last_edited_by', 'edit_remark',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'author', 'content_parsed',
            'last_edited_by', 'edit_remark',
            'created_at', 'updated_at',
        ]

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return obj.byline or 'Unknown'


class ArticleListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'headline', 'subheadline', 'byline',
            'content_format', 'status', 'category', 'category_name',
            'priority', 'highlights_mode', 'order',
            'author', 'author_name', 'edit_remark',
            'created_at',
        ]

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return obj.byline or 'Unknown'


class EditionSerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Edition
        fields = [
            'id', 'name', 'newspaper_name', 'edition_number',
            'publication_date', 'page_size', 'layout_mode',
            'style_preset', 'status', 'generated_pdf',
            'chief_editor', 'inspiration_source',
            'article_count', 'created_by', 'created_by_name', 'is_owner',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'generated_pdf',
            'created_by', 'created_by_name', 'is_owner',
            'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'Unknown'

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.created_by == request.user
        return False


class EditionDetailSerializer(EditionSerializer):
    """Edition with nested articles for detail view."""
    articles = ArticleListSerializer(many=True, read_only=True)

    class Meta(EditionSerializer.Meta):
        fields = EditionSerializer.Meta.fields + ['articles']


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ['id', 'name', 'description', 'layout_definition', 'is_active']
        read_only_fields = ['id']


class PDFGenerationJobSerializer(serializers.ModelSerializer):
    edition_name = serializers.CharField(source='edition.name', read_only=True)

    class Meta:
        model = PDFGenerationJob
        fields = [
            'id', 'edition', 'edition_name', 'status',
            'progress_percent', 'error_message',
            'started_at', 'completed_at', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'progress_percent', 'error_message',
                            'started_at', 'completed_at', 'created_at']
