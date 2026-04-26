"""
Media Pulse — Data Models

Scalable design:
- Abstract base model with UUID PKs and timestamps
- Proper db_index on frequently queried fields
- Choices as TextChoices for type safety
- JSONField for flexible structured data
- Owner/author FK for data isolation
"""

import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class BaseModel(models.Model):
    """Abstract base for all models — UUID PK + timestamps."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


# ─── Choices ───────────────────────────────────────────────

class PageSize(models.TextChoices):
    TABLOID = 'TABLOID', 'Tabloid (11×17")'
    BROADSHEET = 'BROADSHEET', 'Broadsheet (15×22")'
    A4 = 'A4', 'A4 (210×297mm)'
    LETTER = 'LETTER', 'Letter (8.5×11")'


class EditionStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    GENERATING = 'GENERATING', 'Generating'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'


class ArticleStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted for Review'
    PUBLISHED = 'PUBLISHED', 'Published'
    ARCHIVED = 'ARCHIVED', 'Archived'


class LayoutMode(models.TextChoices):
    FIXED_TEMPLATE = 'FIXED_TEMPLATE', 'Fixed Template'


class StylePreset(models.TextChoices):
    DEFAULT = 'DEFAULT', 'Default'
    CLASSIC = 'CLASSIC', 'Classic'
    MODERN = 'MODERN', 'Modern'


class ContentFormat(models.TextChoices):
    PLAINTEXT = 'PLAINTEXT', 'Plain Text'
    MARKDOWN = 'MARKDOWN', 'Markdown'
    JSON = 'JSON', 'JSON'
    YAML = 'YAML', 'YAML'


class ArticlePriority(models.TextChoices):
    HERO = 'HERO', 'Hero (Full Width)'
    MAJOR = 'MAJOR', 'Major (3 Columns)'
    STANDARD = 'STANDARD', 'Standard (2 Columns)'
    MINOR = 'MINOR', 'Minor (1 Column)'


class HighlightsMode(models.TextChoices):
    NONE = 'NONE', 'None'
    MANUAL = 'MANUAL', 'Manual'
    EXTRACTIVE = 'EXTRACTIVE', 'Extractive'
    LLM = 'LLM', 'LLM Generated'


class JobStatus(models.TextChoices):
    QUEUED = 'QUEUED', 'Queued'
    PROCESSING = 'PROCESSING', 'Processing'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'


# ─── Models ───────────────────────────────────────────────

class Category(models.Model):
    """Article category for section organization."""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    page_number = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text='PDF page number for this category (0 = auto-place)',
    )

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['page_number', 'display_order', 'name']

    def __str__(self):
        return f"{self.name} (p.{self.page_number})" if self.page_number else self.name


class Edition(BaseModel):
    """A newspaper edition containing multiple articles."""
    name = models.CharField(max_length=200)
    newspaper_name = models.CharField(max_length=200, default='Media Pulse')
    edition_number = models.PositiveIntegerField(db_index=True)
    publication_date = models.DateField(db_index=True)
    page_size = models.CharField(
        max_length=20,
        choices=PageSize.choices,
        default=PageSize.TABLOID,
    )
    layout_mode = models.CharField(
        max_length=20,
        choices=LayoutMode.choices,
        default=LayoutMode.FIXED_TEMPLATE,
    )
    style_preset = models.CharField(
        max_length=20,
        choices=StylePreset.choices,
        default=StylePreset.DEFAULT,
    )
    status = models.CharField(
        max_length=20,
        choices=EditionStatus.choices,
        default=EditionStatus.DRAFT,
        db_index=True,
    )
    generated_pdf = models.FileField(
        upload_to='editions/pdfs/',
        null=True,
        blank=True,
    )
    chief_editor = models.CharField(
        max_length=200,
        default='बलराम दीक्षित',
        help_text='प्रधान सम्पादक name for masthead',
    )
    inspiration_source = models.CharField(
        max_length=200,
        default='स्व0 सूर्यनारायण त्रिपाठी',
        help_text='प्रेरणा स्रोत name for masthead',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='editions',
        null=True,
        blank=True,
    )

    class Meta(BaseModel.Meta):
        unique_together = ['newspaper_name', 'edition_number']
        indexes = [
            models.Index(fields=['created_by', 'status']),
        ]

    def __str__(self):
        return f"{self.newspaper_name} — #{self.edition_number} ({self.publication_date})"

    @property
    def article_count(self):
        return self.articles.count()


class Article(BaseModel):
    """A single news article within an edition."""
    edition = models.ForeignKey(
        Edition,
        on_delete=models.CASCADE,
        related_name='articles',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='articles',
        null=True,
        blank=True,
    )
    headline = models.CharField(max_length=500)
    subheadline = models.CharField(max_length=500, blank=True, default='')
    byline = models.CharField(max_length=200, blank=True, default='')
    content_raw = models.TextField()
    content_format = models.CharField(
        max_length=20,
        choices=ContentFormat.choices,
        default=ContentFormat.PLAINTEXT,
    )
    content_parsed = models.TextField(
        blank=True,
        default='',
        help_text='HTML output from parser',
    )
    status = models.CharField(
        max_length=20,
        choices=ArticleStatus.choices,
        default=ArticleStatus.PUBLISHED,
        db_index=True,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='articles',
    )
    priority = models.CharField(
        max_length=20,
        choices=ArticlePriority.choices,
        default=ArticlePriority.STANDARD,
        db_index=True,
    )
    highlights = models.JSONField(default=list, blank=True)
    highlights_mode = models.CharField(
        max_length=20,
        choices=HighlightsMode.choices,
        default=HighlightsMode.NONE,
    )
    image = models.ImageField(
        upload_to='articles/images/',
        null=True,
        blank=True,
    )
    image_caption = models.CharField(max_length=300, blank=True, default='')
    order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text='Manual ordering within edition',
    )
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='edited_articles',
    )
    edit_remark = models.CharField(
        max_length=300,
        blank=True,
        default='',
        help_text='Auto-set when Editor/Admin edits another user article',
    )

    class Meta(BaseModel.Meta):
        ordering = ['order', '-priority', '-created_at']
        indexes = [
            models.Index(fields=['edition', 'priority']),
            models.Index(fields=['edition', 'status']),
            models.Index(fields=['edition', 'order']),
            models.Index(fields=['author', 'created_at']),
        ]

    def __str__(self):
        return f"[{self.priority}] {self.headline[:60]}"


class Template(BaseModel):
    """Layout template definition for newspaper pages."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    layout_definition = models.JSONField(
        default=dict,
        help_text='JSON structure defining page layout blocks',
    )
    is_active = models.BooleanField(default=True, db_index=True)

    def __str__(self):
        return self.name


class PDFGenerationJob(BaseModel):
    """Tracks async PDF generation progress."""
    edition = models.ForeignKey(
        Edition,
        on_delete=models.CASCADE,
        related_name='generation_jobs',
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.QUEUED,
        db_index=True,
    )
    progress_percent = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    error_message = models.TextField(blank=True, default='')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Job for {self.edition.name} — {self.status}"
