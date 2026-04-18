"""Public API views — no auth required, read-only for landing page."""

from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count

from .models import Edition, Article, Category
from .serializers import ArticleListSerializer, CategorySerializer


class PublicPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 50


class PublicArticleSerializer(ArticleListSerializer):
    """Extended public serializer with extra fields for landing page."""

    class Meta(ArticleListSerializer.Meta):
        fields = ArticleListSerializer.Meta.fields + ['image', 'image_caption', 'content_raw']


@api_view(['GET'])
@permission_classes([AllowAny])
def featured_articles(request):
    """Hero + featured articles for homepage (top 5 by priority)."""
    articles = (
        Article.objects
        .select_related('category', 'author', 'edition')
        .filter(edition__status='COMPLETED')
        .order_by('-priority', '-created_at')[:5]
    )
    serializer = PublicArticleSerializer(articles, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def trending_articles(request):
    """Trending articles — most recent completed editions, ordered by priority."""
    articles = (
        Article.objects
        .select_related('category', 'author', 'edition')
        .filter(edition__status='COMPLETED')
        .order_by('-created_at')[:10]
    )
    serializer = PublicArticleSerializer(articles, many=True)
    return Response(serializer.data)


class LatestArticlesView(generics.ListAPIView):
    """Paginated latest articles from completed editions."""
    serializer_class = PublicArticleSerializer
    permission_classes = [AllowAny]
    pagination_class = PublicPagination

    def get_queryset(self):
        return (
            Article.objects
            .select_related('category', 'author', 'edition')
            .filter(edition__status='COMPLETED')
            .order_by('-created_at')
        )


class CategoryArticlesView(generics.ListAPIView):
    """Articles filtered by category name (slug-like)."""
    serializer_class = PublicArticleSerializer
    permission_classes = [AllowAny]
    pagination_class = PublicPagination

    def get_queryset(self):
        category_name = self.kwargs.get('category_name', '')
        return (
            Article.objects
            .select_related('category', 'author', 'edition')
            .filter(
                edition__status='COMPLETED',
                category__name__iexact=category_name,
            )
            .order_by('-created_at')
        )


class SearchArticlesView(generics.ListAPIView):
    """Search articles by headline/content."""
    serializer_class = PublicArticleSerializer
    permission_classes = [AllowAny]
    pagination_class = PublicPagination

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        qs = (
            Article.objects
            .select_related('category', 'author', 'edition')
            .filter(edition__status='COMPLETED')
        )
        if q:
            qs = qs.filter(
                headline__icontains=q
            ) | qs.filter(
                content_raw__icontains=q
            )
        return qs.order_by('-created_at')


@api_view(['GET'])
@permission_classes([AllowAny])
def public_categories(request):
    """All categories for navigation chips."""
    categories = Category.objects.annotate(
        article_count=Count('articles')
    ).order_by('display_order')
    data = [
        {
            'id': c.id,
            'name': c.name,
            'display_order': c.display_order,
            'article_count': c.article_count,
        }
        for c in categories
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def top_journalists(request):
    """Top journalists by article count — for journalist highlights section."""
    from accounts.models import User, UserRole
    journalists = (
        User.objects
        .filter(role__in=[UserRole.JOURNALIST, UserRole.EDITOR])
        .annotate(article_count=Count('articles'))
        .order_by('-article_count')[:6]
    )
    data = [
        {
            'id': str(j.id),
            'username': j.username,
            'full_name': j.get_full_name() or j.username,
            'avatar': j.avatar.url if j.avatar else None,
            'bio': j.bio[:120] if j.bio else '',
            'role': j.role,
            'article_count': j.article_count,
        }
        for j in journalists
    ]
    return Response(data)
