"""API ViewSets with RBAC enforcement and data isolation."""

from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Edition, Article, Category, Template, PDFGenerationJob
from .serializers import (
    EditionSerializer, EditionDetailSerializer,
    ArticleSerializer, ArticleListSerializer,
    CategorySerializer, TemplateSerializer,
    PDFGenerationJobSerializer,
)
from .permissions import (
    ReadOnlyOrJournalist, IsOwnerOrEditor,
    IsArticleOwnerOrEditor, ReadAllWriteEditor,
    ReadAllWriteAdmin, IsEditorOrAbove,
)


class CategoryViewSet(viewsets.ModelViewSet):
    """Categories: authenticated read, Editor+ write."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, ReadAllWriteEditor]


class EditionViewSet(viewsets.ModelViewSet):
    """
    Editions with data isolation:
    - Journalist sees ALL editions (read-only for others')
    - Editor+ sees all and can edit any
    - Reader cannot access at all (blocked at route level)
    """
    permission_classes = [IsAuthenticated, ReadOnlyOrJournalist]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EditionDetailSerializer
        return EditionSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        return Edition.objects.annotate(
            article_count_val=models.Count('articles')
        ).select_related('created_by').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            if not request.user.is_editor and obj.created_by != request.user:
                self.permission_denied(request, message='You can only edit your own editions.')

    @action(detail=True, methods=['get'])
    def articles(self, request, pk=None):
        """List all articles for a specific edition."""
        edition = self.get_object()
        articles = edition.articles.select_related('category', 'author').all()
        serializer = ArticleListSerializer(articles, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='generate-pdf')
    def generate_pdf(self, request, pk=None):
        """Trigger PDF generation — Editor+ only."""
        if not request.user.is_editor:
            return Response(
                {'error': 'Only editors can generate PDFs.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        edition = self.get_object()
        if edition.articles.count() == 0:
            return Response(
                {'error': 'Edition has no articles.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from generator.services import generate_edition_pdf

        try:
            edition.status = 'GENERATING'
            edition.save(update_fields=['status'])
            pdf_path = generate_edition_pdf(edition)
            edition.status = 'COMPLETED'
            edition.save(update_fields=['status'])
            return Response({
                'status': 'success',
                'message': 'PDF generated successfully.',
                'pdf_url': request.build_absolute_uri(edition.generated_pdf.url),
            })
        except Exception as e:
            edition.status = 'FAILED'
            edition.save(update_fields=['status'])
            return Response(
                {'error': f'PDF generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ArticleViewSet(viewsets.ModelViewSet):
    """
    Articles with data isolation:
    - Journalist sees own articles only
    - Editor+ sees all
    """
    permission_classes = [IsAuthenticated, ReadOnlyOrJournalist]

    def get_serializer_class(self):
        if self.action == 'list':
            return ArticleListSerializer
        return ArticleSerializer

    def get_queryset(self):
        qs = Article.objects.select_related('category', 'edition', 'author').all()
        user = self.request.user
        if not user.is_editor:
            qs = qs.filter(author=user)
        return qs

    def perform_create(self, serializer):
        """Auto-set author and parse content."""
        article = serializer.save(author=self.request.user)
        from generator.parsers import parse_content
        article.content_parsed = parse_content(
            article.content_raw,
            article.content_format,
        )
        article.save(update_fields=['content_parsed'])

    def perform_update(self, serializer):
        """Re-parse content. Track edits by non-owners."""
        article = serializer.instance
        is_own = article.author == self.request.user

        save_kwargs = {}
        if not is_own and self.request.user.is_editor:
            role_label = self.request.user.get_role_display()
            name = self.request.user.get_full_name() or self.request.user.username
            save_kwargs['last_edited_by'] = self.request.user
            save_kwargs['edit_remark'] = f'Edited by {role_label}: {name}'

        article = serializer.save(**save_kwargs)
        from generator.parsers import parse_content
        article.content_parsed = parse_content(
            article.content_raw,
            article.content_format,
        )
        article.save(update_fields=['content_parsed'])

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            if not request.user.is_editor and obj.author != request.user:
                self.permission_denied(request, message='You can only edit your own articles.')

    @action(detail=True, methods=['post'], url_path='generate-highlights')
    def generate_highlights(self, request, pk=None):
        article = self.get_object()
        content = article.content_parsed or article.content_raw
        if not content.strip():
            return Response(
                {'error': 'Article has no content to extract highlights from.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from generator.highlights import extract_highlights
        highlights = extract_highlights(content, max_highlights=5)
        article.highlights = highlights
        article.highlights_mode = 'EXTRACTIVE'
        article.save(update_fields=['highlights', 'highlights_mode'])
        return Response({
            'highlights': highlights,
            'mode': 'EXTRACTIVE',
            'count': len(highlights),
        })

    @action(detail=True, methods=['post'], url_path='upload-image')
    def upload_image(self, request, pk=None):
        article = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if image_file.content_type not in allowed_types:
            return Response({'error': f'Invalid image type.'}, status=status.HTTP_400_BAD_REQUEST)
        if image_file.size > 10 * 1024 * 1024:
            return Response({'error': 'Image exceeds 10MB limit.'}, status=status.HTTP_400_BAD_REQUEST)
        article.image = image_file
        article.save(update_fields=['image'])
        return Response(ArticleSerializer(article).data)

    @action(detail=True, methods=['delete'], url_path='remove-image')
    def remove_image(self, request, pk=None):
        article = self.get_object()
        if article.image:
            article.image.delete(save=False)
            article.image = None
            article.save(update_fields=['image'])
        return Response({'detail': 'Image removed.'})


class TemplateViewSet(viewsets.ModelViewSet):
    """Templates: authenticated read, Admin+ write."""
    queryset = Template.objects.all()
    serializer_class = TemplateSerializer
    permission_classes = [IsAuthenticated, ReadAllWriteAdmin]
