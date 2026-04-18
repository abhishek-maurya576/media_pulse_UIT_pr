"""Authentication + profile + follow + admin views."""

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404

from .models import User, Follow, UserRole
from .serializers import (
    UserSerializer,
    PublicProfileSerializer,
    UserListSerializer,
    FollowerSerializer,
    FollowingSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
)


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

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_user_list(request):
    """List all users — Admin+ only."""
    if not request.user.is_admin_user:
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    users = User.objects.all().order_by('-date_joined')
    serializer = UserListSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def change_user_role(request, user_id):
    """Change a user's role — SuperAdmin only."""
    if request.user.role != UserRole.SUPERADMIN:
        return Response({'error': 'SuperAdmin access required.'}, status=status.HTTP_403_FORBIDDEN)
    user = get_object_or_404(User, id=user_id)
    new_role = request.data.get('role')
    if new_role not in [choice[0] for choice in UserRole.choices]:
        return Response({'error': f'Invalid role. Valid: {[c[0] for c in UserRole.choices]}'}, status=status.HTTP_400_BAD_REQUEST)
    user.role = new_role
    user.save(update_fields=['role'])
    return Response(UserListSerializer(user).data)
