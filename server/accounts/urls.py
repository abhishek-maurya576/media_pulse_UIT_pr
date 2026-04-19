"""URL routes for accounts — auth + profiles + follows + admin user management."""

from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),

    # Public profiles
    path('users/<str:username>/', views.public_profile, name='public-profile'),
    path('users/<str:username>/follow/', views.follow_user, name='follow-user'),
    path('users/<str:username>/unfollow/', views.unfollow_user, name='unfollow-user'),
    path('users/<str:username>/followers/', views.user_followers, name='user-followers'),
    path('users/<str:username>/following/', views.user_following, name='user-following'),

    # Admin user management
    path('admin/users/', views.admin_user_list, name='admin-user-list'),
    path('admin/users/<uuid:user_id>/', views.admin_user_detail, name='admin-user-detail'),
    path('admin/users/<uuid:user_id>/role/', views.change_user_role, name='change-user-role'),
    path('admin/users/<uuid:user_id>/status/', views.change_user_status, name='change-user-status'),
    path('admin/users/<uuid:user_id>/reset-password/', views.admin_reset_password, name='admin-reset-password'),
    path('admin/users/<uuid:user_id>/force-logout/', views.admin_force_logout, name='admin-force-logout'),
    path('admin/users/bulk-status/', views.admin_bulk_status, name='admin-bulk-status'),
    path('admin/users/bulk-role/', views.admin_bulk_role, name='admin-bulk-role'),
    path('admin/audit-logs/', views.admin_audit_logs, name='admin-audit-logs'),
    path('admin/stats/', views.admin_user_stats, name='admin-user-stats'),
]
