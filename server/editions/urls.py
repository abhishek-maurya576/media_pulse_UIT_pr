"""URL routing for editions API — protected + public."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EditionViewSet, ArticleViewSet,
    CategoryViewSet, TemplateViewSet,
)
from . import public_views

router = DefaultRouter()
router.register(r'editions', EditionViewSet, basename='edition')
router.register(r'articles', ArticleViewSet, basename='article')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'templates', TemplateViewSet, basename='template')

urlpatterns = [
    # Protected API (authenticated)
    path('', include(router.urls)),

    # Public API (no auth required — for landing page)
    path('public/featured/', public_views.featured_articles, name='public-featured'),
    path('public/trending/', public_views.trending_articles, name='public-trending'),
    path('public/latest/', public_views.LatestArticlesView.as_view(), name='public-latest'),
    path('public/categories/', public_views.public_categories, name='public-categories'),
    path('public/category/<str:category_name>/', public_views.CategoryArticlesView.as_view(), name='public-category'),
    path('public/search/', public_views.SearchArticlesView.as_view(), name='public-search'),
    path('public/journalists/', public_views.top_journalists, name='public-journalists'),
]
