"""Blog URL routes — public + authenticated management."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'manage', views.BlogPostViewSet, basename='blog-manage')

urlpatterns = [
    # Public blog endpoints
    path('posts/', views.PublicBlogListView.as_view(), name='blog-public-list'),
    path('posts/<slug:slug>/', views.public_blog_detail, name='blog-public-detail'),

    # Authenticated management
    path('', include(router.urls)),
]
