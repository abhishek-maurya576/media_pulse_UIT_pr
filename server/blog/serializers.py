"""Blog serializers."""

from rest_framework import serializers
from .models import BlogPost


class BlogPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'author', 'author_name', 'author_username', 'author_avatar',
            'title', 'slug', 'content', 'excerpt',
            'cover_image', 'status', 'tags',
            'views_count', 'published_at',
            'last_edited_by', 'edit_remark',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'author', 'slug', 'views_count',
            'last_edited_by', 'edit_remark',
            'created_at', 'updated_at',
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username

    def get_author_avatar(self, obj):
        if obj.author.avatar:
            return obj.author.avatar.url
        return None


class BlogPostListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""
    author_name = serializers.SerializerMethodField()
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = BlogPost
        fields = [
            'id', 'author', 'author_name', 'author_username',
            'title', 'slug', 'excerpt', 'cover_image',
            'status', 'tags', 'views_count',
            'published_at', 'edit_remark', 'created_at',
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username
