"""API ViewSets with RBAC enforcement and data isolation."""

import threading

from django.db import models, transaction, connection
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Edition, Article, Category, Template, PDFGenerationJob,
    EditionStatus, JobStatus,
)
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


def _run_pdf_generation(edition_id, job_id):
    """Background thread target for PDF rendering.

    Re-fetches models from DB (thread has its own connection),
    runs Playwright, then updates job/edition status.
    """
    try:
        from generator.services import generate_edition_pdf

        edition = Edition.objects.get(pk=edition_id)
        job = PDFGenerationJob.objects.get(pk=job_id)

        job.progress_percent = 20
        job.save(update_fields=['progress_percent'])

        generate_edition_pdf(edition)

        edition.status = EditionStatus.COMPLETED
        edition.save(update_fields=['status'])
        job.status = JobStatus.COMPLETED
        job.progress_percent = 100
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'progress_percent', 'completed_at'])

    except Exception as e:
        try:
            edition = Edition.objects.get(pk=edition_id)
            edition.status = EditionStatus.FAILED
            edition.save(update_fields=['status'])

            job = PDFGenerationJob.objects.get(pk=job_id)
            job.status = JobStatus.FAILED
            job.error_message = str(e)[:2000]
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
        except Exception:
            pass  # DB unreachable; nothing we can do

    finally:
        connection.close()

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
        """Trigger background PDF generation — Editor+ only."""
        if not request.user.is_editor:
            return Response(
                {'error': 'Only editors can generate PDFs.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        edition = self.get_object()

        with transaction.atomic():
            locked_edition = Edition.objects.select_for_update().get(pk=edition.pk)

            if locked_edition.status == EditionStatus.GENERATING:
                active_job = (
                    locked_edition.generation_jobs
                    .filter(status__in=[JobStatus.QUEUED, JobStatus.PROCESSING])
                    .order_by('-created_at')
                    .first()
                )
                response_data = {
                    'error': 'PDF generation is already in progress for this edition.',
                    'status': locked_edition.status,
                }
                if active_job:
                    response_data['job_id'] = str(active_job.id)
                return Response(response_data, status=status.HTTP_409_CONFLICT)

            if not locked_edition.articles.exists():
                return Response(
                    {'error': 'Edition has no articles.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            locked_edition.status = EditionStatus.GENERATING
            locked_edition.save(update_fields=['status'])
            job = PDFGenerationJob.objects.create(
                edition=locked_edition,
                status=JobStatus.PROCESSING,
                progress_percent=5,
                started_at=timezone.now(),
            )

        # Run PDF generation in a background thread so the request
        # returns immediately with the job_id for polling.
        edition_id = locked_edition.pk
        job_id = job.pk
        thread = threading.Thread(
            target=_run_pdf_generation,
            args=(edition_id, job_id),
            daemon=True,
        )
        thread.start()

        return Response({
            'status': 'queued',
            'message': 'PDF generation started in background.',
            'job_id': str(job.id),
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['get'], url_path='pdf-status')
    def pdf_status(self, request, pk=None):
        """Poll the latest PDF generation job status."""
        edition = self.get_object()
        job = (
            edition.generation_jobs
            .order_by('-created_at')
            .first()
        )
        if not job:
            return Response(
                {'error': 'No PDF generation jobs found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = PDFGenerationJobSerializer(job).data
        if job.status == JobStatus.COMPLETED and edition.generated_pdf:
            data['pdf_url'] = request.build_absolute_uri(edition.generated_pdf.url)
        return Response(data)


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
        """Auto-set author, parse content, and check edition ownership."""
        edition = serializer.validated_data.get('edition')
        user = self.request.user
        if edition and not user.is_editor and edition.created_by != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only add articles to your own editions.')
        article = serializer.save(author=user)
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
            return Response({'error': 'Invalid image type.'}, status=status.HTTP_400_BAD_REQUEST)
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

    @action(detail=False, methods=['post'], url_path='bulk-reorder')
    def bulk_reorder(self, request):
        """Atomically reorder multiple articles in a single request."""
        orders = request.data.get('orders', [])
        if not orders or not isinstance(orders, list):
            return Response(
                {'error': 'Provide a list of {id, order} objects.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        article_ids = [item['id'] for item in orders if 'id' in item and 'order' in item]
        if not article_ids:
            return Response(
                {'error': 'No valid order entries.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify user has access to these articles
        qs = Article.objects.filter(id__in=article_ids)
        if not request.user.is_editor:
            qs = qs.filter(author=request.user)

        accessible_ids = set(str(a.id) for a in qs.only('id'))

        with transaction.atomic():
            updated = 0
            for item in orders:
                aid = str(item.get('id', ''))
                new_order = item.get('order')
                if aid in accessible_ids and isinstance(new_order, int):
                    Article.objects.filter(id=aid).update(order=new_order)
                    updated += 1

        return Response({'updated': updated})


class TemplateViewSet(viewsets.ModelViewSet):
    """Templates: authenticated read, Admin+ write."""
    queryset = Template.objects.all()
    serializer_class = TemplateSerializer
    permission_classes = [IsAuthenticated, ReadAllWriteAdmin]
