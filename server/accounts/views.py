"""Authentication + profile + follow + admin user management views."""

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone

from .models import User, Follow, UserRole, UserStatus, AuditLog, ROLE_HIERARCHY
from .serializers import (
    UserSerializer,
    PublicProfileSerializer,
    UserListSerializer,
    FollowerSerializer,
    FollowingSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    AdminUserListSerializer,
    AdminUserDetailSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    AuditLogSerializer,
)


# ─── Helper: RBAC enforcement ───

def _get_role_rank(role_str):
    """Get numeric rank for a role string."""
    try:
        return ROLE_HIERARCHY.index(role_str)
    except ValueError:
        return -1


def _can_actor_manage_target(actor, target):
    """Check if actor has higher rank than target."""
    return actor.role_rank > target.role_rank


def _can_actor_assign_role(actor, new_role):
    """
    Admin can assign: READER, JOURNALIST, EDITOR
    SuperAdmin can assign: any role
    """
    if actor.role == UserRole.SUPERADMIN:
        return True
    if actor.role == UserRole.ADMIN:
        return new_role in (UserRole.READER, UserRole.JOURNALIST, UserRole.EDITOR)
    return False


# ─── Auth ───

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        # Update last_login
        user.last_login = timezone.now()
        User.objects.filter(pk=user.pk).update(last_login=user.last_login)

        # Log login to audit
        AuditLog.log(
            actor=user,
            action='user.login',
            target_user=user,
            request=request,
        )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
        })


class LogoutView(APIView):
    def post(self, request):
        if hasattr(request.user, 'auth_token'):
            request.user.auth_token.delete()
        return Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated.'})


# ─── Public Profile ───

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_profile(request, username):
    """View any user's public profile."""
    user = get_object_or_404(User, username=username)
    serializer = PublicProfileSerializer(user, context={'request': request})
    return Response(serializer.data)


# ─── Follow System ───

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def follow_user(request, username):
    """Follow a user. Reader+ can follow."""
    if not request.user.has_perm_custom('user.follow'):
        return Response(
            {'error': 'You do not have permission to follow users.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    target = get_object_or_404(User, username=username)
    if target == request.user:
        return Response({'error': 'Cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
    _, created = Follow.objects.get_or_create(follower=request.user, following=target)
    if not created:
        return Response({'detail': 'Already following.'}, status=status.HTTP_200_OK)
    return Response({'detail': f'Now following {target.username}.'}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unfollow_user(request, username):
    """Unfollow a user."""
    target = get_object_or_404(User, username=username)
    deleted, _ = Follow.objects.filter(follower=request.user, following=target).delete()
    if deleted:
        return Response({'detail': f'Unfollowed {target.username}.'})
    return Response({'detail': 'Was not following.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_followers(request, username):
    """List followers of a user."""
    user = get_object_or_404(User, username=username)
    follows = Follow.objects.filter(following=user).select_related('follower')
    serializer = FollowerSerializer(follows, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_following(request, username):
    """List who a user follows."""
    user = get_object_or_404(User, username=username)
    follows = Follow.objects.filter(follower=user).select_related('following')
    serializer = FollowingSerializer(follows, many=True)
    return Response(serializer.data)


# ─── Admin: User Management (Admin+) ───

class AdminUserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_user_list(request):
    """
    GET: List all users with filters — Admin+ only.
    POST: Create a new user — Admin+ only.
    """
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        queryset = User.objects.all().select_related('created_by').annotate(
            article_count=Count('articles', distinct=True),
            blog_count=Count('blog_posts', distinct=True),
        )

        # Filters
        role = request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)

        user_status = request.query_params.get('status')
        if user_status:
            queryset = queryset.filter(status=user_status)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        queryset = queryset.order_by('-date_joined')

        paginator = AdminUserPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = AdminUserListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AdminUserListSerializer(queryset, many=True)
        return Response(serializer.data)

    # POST: Create user
    serializer = AdminUserCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    new_role = serializer.validated_data.get('role', UserRole.READER)
    if not _can_actor_assign_role(request.user, new_role):
        return Response(
            {'error': f'You cannot assign the role "{new_role}". Only SuperAdmin can assign Admin/SuperAdmin roles.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    user = serializer.save(created_by=request.user)

    AuditLog.log(
        actor=request.user,
        action='user.created',
        target_user=user,
        request=request,
        role=user.role,
    )

    return Response(
        AdminUserListSerializer(user).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def admin_user_detail(request, user_id):
    """
    GET: Get user detail — Admin+ only.
    PATCH: Update user profile — Admin+ only.
    """
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    target = get_object_or_404(User, id=user_id)

    if request.method == 'GET':
        serializer = AdminUserDetailSerializer(target)
        return Response(serializer.data)

    # PATCH: Admin cannot edit users with equal/higher rank (unless SuperAdmin)
    if not _can_actor_manage_target(request.user, target) and request.user != target:
        return Response(
            {'error': 'Cannot modify a user with equal or higher role.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = AdminUserUpdateSerializer(target, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    AuditLog.log(
        actor=request.user,
        action='user.updated',
        target_user=target,
        request=request,
        changed_fields=list(request.data.keys()),
    )

    return Response(AdminUserDetailSerializer(target).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def change_user_role(request, user_id):
    """Change a user's role — scoped by actor's rank."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    target = get_object_or_404(User, id=user_id)
    new_role = request.data.get('role')

    if new_role not in [c[0] for c in UserRole.choices]:
        return Response(
            {'error': f'Invalid role. Valid: {[c[0] for c in UserRole.choices]}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Self-protection: can't change own role
    if target == request.user:
        return Response(
            {'error': 'Cannot change your own role.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Can't modify users with equal/higher rank
    if not _can_actor_manage_target(request.user, target):
        return Response(
            {'error': 'Cannot modify a user with equal or higher role.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Check if actor can assign the new role
    if not _can_actor_assign_role(request.user, new_role):
        return Response(
            {'error': f'You cannot assign the role "{new_role}".'},
            status=status.HTTP_403_FORBIDDEN,
        )

    old_role = target.role
    target.role = new_role
    target.save(update_fields=['role'])

    AuditLog.log(
        actor=request.user,
        action='role.changed',
        target_user=target,
        request=request,
        old_role=old_role,
        new_role=new_role,
    )

    return Response(AdminUserListSerializer(target).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def change_user_status(request, user_id):
    """Change user status (suspend/ban/activate/delete) — Admin+ only."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    target = get_object_or_404(User, id=user_id)
    new_status = request.data.get('status')
    reason = request.data.get('reason', '')

    if new_status not in [c[0] for c in UserStatus.choices]:
        return Response(
            {'error': f'Invalid status. Valid: {[c[0] for c in UserStatus.choices]}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Self-protection: can't change own status
    if target == request.user:
        return Response(
            {'error': 'Cannot change your own status.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Can't modify users with equal/higher rank
    if not _can_actor_manage_target(request.user, target):
        return Response(
            {'error': 'Cannot modify a user with equal or higher role.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Minimum admin protection: can't delete/suspend last admin
    if new_status in (UserStatus.SUSPENDED, UserStatus.BANNED, UserStatus.DELETED):
        if target.role in (UserRole.ADMIN, UserRole.SUPERADMIN):
            active_admins = User.objects.filter(
                role__in=[UserRole.ADMIN, UserRole.SUPERADMIN],
                status=UserStatus.ACTIVE,
            ).exclude(id=target.id).count()
            if active_admins == 0:
                return Response(
                    {'error': 'Cannot deactivate the last active admin/superadmin.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

    old_status = target.status
    target.status = new_status
    target.status_reason = reason
    target.status_changed_at = timezone.now()
    target.save(update_fields=['status', 'status_reason', 'status_changed_at', 'is_active'])

    # If suspended/banned/deleted, delete their auth token to force logout
    if new_status != UserStatus.ACTIVE:
        Token.objects.filter(user=target).delete()

    action_map = {
        UserStatus.ACTIVE: 'user.activated',
        UserStatus.SUSPENDED: 'user.suspended',
        UserStatus.BANNED: 'user.banned',
        UserStatus.DELETED: 'user.deleted',
    }

    AuditLog.log(
        actor=request.user,
        action=action_map.get(new_status, 'status.changed'),
        target_user=target,
        request=request,
        old_status=old_status,
        new_status=new_status,
        reason=reason,
    )

    return Response(AdminUserListSerializer(target).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_reset_password(request, user_id):
    """Admin sets a new password for a user."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    target = get_object_or_404(User, id=user_id)
    new_password = request.data.get('new_password')

    if not new_password or len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    # Can't reset password for users with equal/higher rank
    if not _can_actor_manage_target(request.user, target) and request.user != target:
        return Response(
            {'error': 'Cannot reset password for a user with equal or higher role.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    target.set_password(new_password)
    target.save(update_fields=['password'])

    # Invalidate existing token so user must re-login
    Token.objects.filter(user=target).delete()

    AuditLog.log(
        actor=request.user,
        action='password.reset',
        target_user=target,
        request=request,
    )

    return Response({'detail': f'Password reset for {target.username}.'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_force_logout(request, user_id):
    """Delete user's auth token to force logout."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    target = get_object_or_404(User, id=user_id)

    if not _can_actor_manage_target(request.user, target) and request.user != target:
        return Response(
            {'error': 'Cannot force logout a user with equal or higher role.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    deleted_count, _ = Token.objects.filter(user=target).delete()

    AuditLog.log(
        actor=request.user,
        action='user.force_logout',
        target_user=target,
        request=request,
        tokens_deleted=deleted_count,
    )

    return Response({'detail': f'Forced logout for {target.username}. {deleted_count} token(s) deleted.'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_bulk_status(request):
    """Bulk status change for multiple users."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    user_ids = request.data.get('user_ids', [])
    new_status = request.data.get('status')
    reason = request.data.get('reason', '')

    if not user_ids:
        return Response({'error': 'No users specified.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_status not in [c[0] for c in UserStatus.choices]:
        return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    targets = User.objects.filter(id__in=user_ids)
    updated = 0
    errors = []

    for target in targets:
        if target == request.user:
            errors.append(f'{target.username}: Cannot change own status.')
            continue
        if not _can_actor_manage_target(request.user, target):
            errors.append(f'{target.username}: Insufficient permissions.')
            continue

        old_status = target.status
        target.status = new_status
        target.status_reason = reason
        target.status_changed_at = timezone.now()
        target.save(update_fields=['status', 'status_reason', 'status_changed_at', 'is_active'])

        if new_status != UserStatus.ACTIVE:
            Token.objects.filter(user=target).delete()

        AuditLog.log(
            actor=request.user,
            action=f'user.{new_status}' if new_status != UserStatus.ACTIVE else 'user.activated',
            target_user=target,
            request=request,
            old_status=old_status,
            new_status=new_status,
            reason=reason,
            bulk=True,
        )
        updated += 1

    return Response({
        'updated': updated,
        'errors': errors,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_bulk_role(request):
    """Bulk role assignment for multiple users."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    user_ids = request.data.get('user_ids', [])
    new_role = request.data.get('role')

    if not user_ids:
        return Response({'error': 'No users specified.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_role not in [c[0] for c in UserRole.choices]:
        return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
    if not _can_actor_assign_role(request.user, new_role):
        return Response({'error': f'Cannot assign role "{new_role}".'}, status=status.HTTP_403_FORBIDDEN)

    targets = User.objects.filter(id__in=user_ids)
    updated = 0
    errors = []

    for target in targets:
        if target == request.user:
            errors.append(f'{target.username}: Cannot change own role.')
            continue
        if not _can_actor_manage_target(request.user, target):
            errors.append(f'{target.username}: Insufficient permissions.')
            continue

        old_role = target.role
        target.role = new_role
        target.save(update_fields=['role'])

        AuditLog.log(
            actor=request.user,
            action='role.changed',
            target_user=target,
            request=request,
            old_role=old_role,
            new_role=new_role,
            bulk=True,
        )
        updated += 1

    return Response({
        'updated': updated,
        'errors': errors,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_audit_logs(request):
    """View audit logs — SuperAdmin only, Admin can view limited."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    queryset = AuditLog.objects.all().select_related('actor', 'target_user')

    # Filters
    user_id = request.query_params.get('user_id')
    if user_id:
        queryset = queryset.filter(
            Q(actor_id=user_id) | Q(target_user_id=user_id)
        )

    action = request.query_params.get('action')
    if action:
        queryset = queryset.filter(action=action)

    # Admin can only see logs for users they can manage
    if request.user.role != UserRole.SUPERADMIN:
        manageable_ranks = [r for r in ROLE_HIERARCHY if ROLE_HIERARCHY.index(r) < request.user.role_rank]
        queryset = queryset.filter(
            Q(target_user__role__in=manageable_ranks) |
            Q(target_user__isnull=True)
        )

    paginator = AdminUserPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = AuditLogSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_user_stats(request):
    """User statistics — Admin+ only."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    total = User.objects.count()
    by_role = dict(
        User.objects.values_list('role')
        .annotate(count=Count('id'))
        .values_list('role', 'count')
    )
    by_status = dict(
        User.objects.values_list('status')
        .annotate(count=Count('id'))
        .values_list('status', 'count')
    )

    return Response({
        'total': total,
        'by_role': by_role,
        'by_status': by_status,
    })
