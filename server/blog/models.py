"""Blog post model with edit tracking."""

import uuid
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class BlogStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    PUBLISHED = 'PUBLISHED', 'Published'
    ARCHIVED = 'ARCHIVED', 'Archived'


class BlogPost(models.Model):
    """Blog post authored by Journalist+ users."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blog_posts',
    )
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=320, unique=True, blank=True)
    content = models.TextField()
    excerpt = models.TextField(blank=True, default='', help_text='Short preview (auto-generated if empty)')
    cover_image = models.ImageField(upload_to='blog/covers/', null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=BlogStatus.choices,
        default=BlogStatus.DRAFT,
        db_index=True,
    )
    tags = models.JSONField(default=list, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='edited_blog_posts',
    )
    edit_remark = models.CharField(
        max_length=300,
        blank=True,
        default='',
        help_text='Auto-set when Editor/Admin edits another user blog post',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['author', 'status']),
            models.Index(fields=['status', '-published_at']),
        ]

    def __str__(self):
        return self.title[:80]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:300]
            slug = base_slug
            counter = 1
            while BlogPost.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        if not self.excerpt and self.content:
            self.excerpt = self.content[:200].strip()
        super().save(*args, **kwargs)
