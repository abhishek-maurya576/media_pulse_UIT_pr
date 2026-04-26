"""Authentication + profile + admin serializers."""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count
from .models import User, Follow, UserRole, UserStatus, AuditLog, ROLE_HIERARCHY
from .validators import validate_username


class UserSerializer(serializers.ModelSerializer):
    """Private user profile (for own profile view)."""
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    blog_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'avatar', 'bio', 'phone', 'date_joined',
            'follower_count', 'following_count', 'blog_count',
        ]
        read_only_fields = ['id', 'date_joined', 'role']

    def get_follower_count(self, obj):
        return obj.followers_set.count()

    def get_following_count(self, obj):
        return obj.following_set.count()

    def get_blog_count(self, obj):
        return obj.blog_posts.filter(status='PUBLISHED').count()

    def validate_username(self, value):
        from .validators import validate_username as validate_username_base
        try:
            return validate_username_base(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages) if hasattr(e, 'messages') else str(e))


class PublicProfileSerializer(serializers.ModelSerializer):
    """Public user profile — visible to anyone."""
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    blog_count = serializers.SerializerMethodField()
    article_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'role', 'avatar', 'bio', 'date_joined',
            'follower_count', 'following_count',
            'blog_count', 'article_count', 'is_following',
        ]

    def get_follower_count(self, obj):
        return obj.followers_set.count()

    def get_following_count(self, obj):
        return obj.following_set.count()

    def get_blog_count(self, obj):
        return obj.blog_posts.filter(status='PUBLISHED').count()

    def get_article_count(self, obj):
        return obj.articles.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(
                follower=request.user, following=obj
            ).exists()
        return False


class UserListSerializer(serializers.ModelSerializer):
    """For admin user management list."""

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'date_joined',
        ]


class FollowerSerializer(serializers.ModelSerializer):
    """Serializer for follower/following lists."""
    id = serializers.UUIDField(source='follower.id', read_only=True)
    username = serializers.CharField(source='follower.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar = serializers.ImageField(source='follower.avatar', read_only=True)
    role = serializers.CharField(source='follower.role', read_only=True)

    class Meta:
        model = Follow
        fields = ['id', 'username', 'full_name', 'avatar', 'role', 'created_at']

    def get_full_name(self, obj):
        return obj.follower.get_full_name() or obj.follower.username


class FollowingSerializer(serializers.ModelSerializer):
    """Serializer for following lists."""
    id = serializers.UUIDField(source='following.id', read_only=True)
    username = serializers.CharField(source='following.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar = serializers.ImageField(source='following.avatar', read_only=True)
    role = serializers.CharField(source='following.role', read_only=True)

    class Meta:
        model = Follow
        fields = ['id', 'username', 'full_name', 'avatar', 'role', 'created_at']

    def get_full_name(self, obj):
        return obj.following.get_full_name() or obj.following.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm',
                  'first_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def validate_username(self, value):
        from .validators import validate_username as validate_username_base
        try:
            return validate_username_base(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages) if hasattr(e, 'messages') else str(e))

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            # Check if user exists but is inactive (suspended/banned/deleted)
            try:
                existing = User.objects.get(username=data['username'])
                status_messages = {
                    UserStatus.SUSPENDED: 'Your account has been suspended. Contact an administrator.',
                    UserStatus.BANNED: 'Your account has been permanently banned.',
                    UserStatus.DELETED: 'This account no longer exists.',
                }
                if existing.status in status_messages:
                    raise serializers.ValidationError(status_messages[existing.status])
            except User.DoesNotExist:
                pass
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


# ─── Admin Serializers ───


class AdminUserListSerializer(serializers.ModelSerializer):
    """Expanded user list for admin management."""
    created_by_name = serializers.SerializerMethodField()
    article_count = serializers.IntegerField(read_only=True)
    blog_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'status', 'avatar', 'bio',
            'is_active', 'date_joined', 'last_login',
            'created_by_name', 'article_count', 'blog_count',
            'status_reason', 'status_changed_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Full user detail for admin view."""
    created_by_name = serializers.SerializerMethodField()
    article_count = serializers.IntegerField(read_only=True)
    blog_count = serializers.IntegerField(read_only=True)
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    published_blog_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'status', 'avatar', 'bio', 'phone',
            'is_active', 'date_joined', 'last_login',
            'created_by', 'created_by_name',
            'status_reason', 'status_changed_at',
            'article_count', 'blog_count', 'published_blog_count',
            'follower_count', 'following_count',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_published_blog_count(self, obj):
        return obj.blog_posts.filter(status='PUBLISHED').count()

    def get_follower_count(self, obj):
        return obj.followers_set.count()

    def get_following_count(self, obj):
        return obj.following_set.count()


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """For admin user creation."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']

    def validate_username(self, value):
        from .validators import validate_username as validate_username_base
        try:
            return validate_username_base(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages) if hasattr(e, 'messages') else str(e))

    def validate_role(self, value):
        """Role validation happens in the view based on actor's own role."""
        if value not in [c[0] for c in UserRole.choices]:
            raise serializers.ValidationError(f'Invalid role. Valid: {[c[0] for c in UserRole.choices]}')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """For admin profile edits (limited fields)."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'bio', 'phone']


class AuditLogSerializer(serializers.ModelSerializer):
    """For audit log entries."""
    actor_name = serializers.SerializerMethodField()
    target_user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_name', 'action',
            'target_user', 'target_user_name',
            'metadata', 'created_at',
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return 'System'

    def get_target_user_name(self, obj):
        if obj.target_user:
            return obj.target_user.get_full_name() or obj.target_user.username
        return 'Unknown'
