"""Blog API views with RBAC enforcement."""

from django.db.models import F
from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import BlogPost, BlogStatus
from .serializers import BlogPostSerializer, BlogPostListSerializer
from editions.permissions import IsJournalistOrAbove


class BlogPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 50


class PublicBlogListView(generics.ListAPIView):
    """Public blog feed — published posts only, no auth."""
    serializer_class = BlogPostListSerializer
    permission_classes = [AllowAny]
    pagination_class = BlogPagination

    def get_queryset(self):
        return (
            BlogPost.objects
            .select_related('author')
            .filter(status=BlogStatus.PUBLISHED)
            .order_by('-published_at')
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_blog_detail(request, slug):
    """Read a single blog post — increments view count."""
    try:
        post = BlogPost.objects.select_related('author').get(
            slug=slug, status=BlogStatus.PUBLISHED,
        )
    except BlogPost.DoesNotExist:
        return Response({'error': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)

    BlogPost.objects.filter(pk=post.pk).update(views_count=F('views_count') + 1)
    post.views_count += 1  # reflect in serializer response without re-fetching
    serializer = BlogPostSerializer(post)
    return Response(serializer.data)


class BlogPostViewSet(viewsets.ModelViewSet):
    """
    Journalist+ blog management:
    - Create/edit own posts
    - Editor+ can edit any post (with edit_remark tracking)
    """
    serializer_class = BlogPostSerializer
    permission_classes = [IsAuthenticated, IsJournalistOrAbove]

    def get_serializer_class(self):
        if self.action == 'list':
            return BlogPostListSerializer
        return BlogPostSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_editor:
            return BlogPost.objects.select_related('author').all()
        return BlogPost.objects.select_related('author').filter(author=user)

    def perform_create(self, serializer):
        save_kwargs = {'author': self.request.user}
        if serializer.validated_data.get('status') == BlogStatus.PUBLISHED:
            save_kwargs['published_at'] = timezone.now()
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        post = serializer.instance
        is_own = post.author == self.request.user

        save_kwargs = {}
        if not is_own and self.request.user.is_editor:
            role_label = self.request.user.get_role_display()
            name = self.request.user.get_full_name() or self.request.user.username
            save_kwargs['last_edited_by'] = self.request.user
            save_kwargs['edit_remark'] = f'Edited by {role_label}: {name}'

        new_status = serializer.validated_data.get('status')
        if new_status == BlogStatus.PUBLISHED and not post.published_at:
            save_kwargs['published_at'] = timezone.now()

        serializer.save(**save_kwargs)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            if not request.user.is_editor and obj.author != request.user:
                self.permission_denied(request, message='You can only edit your own posts.')

    @action(detail=False, methods=['get'], url_path='my-posts')
    def my_posts(self, request):
        """List own posts (all statuses)."""
        posts = BlogPost.objects.filter(author=request.user).order_by('-created_at')
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = BlogPostListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = BlogPostListSerializer(posts, many=True)
        return Response(serializer.data)
