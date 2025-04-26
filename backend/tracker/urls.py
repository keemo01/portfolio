from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import TokenVerifyView
from .views.user_views import (
    signup,
    CustomTokenObtainPairView,
    PublicTokenRefreshView,
    logout,
)
from .views import user_views, blogs_views, portfolio_views, search_views, follow_views, news_views
from . import views  


urlpatterns = [
    # Authentication
    path('auth/signup/', signup, name='signup'), # User registration
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'), # User login
    path('auth/refresh/', PublicTokenRefreshView.as_view(), name='token_refresh'), # Token refresh
    path('auth/verify/', TokenVerifyView.as_view(), name='token_verify'), # Token verification
    path('auth/logout/', logout, name='logout'), # User logout

    # Protected JWT check
    path('auth/test-token/', user_views.test_token, name='test_token'),

    # Profile
    path('auth/profile/', user_views.user_profile, name='user_profile'), # Get user profile
    path('auth/change-password/', user_views.change_password, name='change_password'), # Change user password

    # Blog endpoints
    path('blogs/', blogs_views.get_blogs, name='get_blogs'), # Get all blogs
    path('blogs/create/', blogs_views.create_blog, name='create_blog'), # Create a new blog
    path('blogs/delete/<int:blog_id>/', blogs_views.delete_blog, name='delete_blog'), # Delete a blog
    path('blogs/<int:pk>/', blogs_views.blog_detail, name='blog_detail'), # Get blog details
    path('blogs/<int:blog_id>/comments/', blogs_views.blog_comments, name='blog_comments'),# Get blog comments
    path('blogs/<int:blog_id>/like/', blogs_views.like_post, name='like_post'),# Like a blog post
    path('blogs/<int:blog_id>/like/count/', blogs_views.like_count, name='blog_like_count'),# Get like count

    # User‑specific blog routes
    path('user-blogs/', user_views.user_blogs, name='user_blogs'),# Get user blogs
    path('user-blog/<int:blog_id>/', user_views.get_user_blog, name='get_user_blog'), # Get user blog details
    path('user-bookmarks/', views.user_bookmarks, name='user_bookmarks'),# Get user bookmarks

    # Comment management
    path('comments/<int:comment_id>/', blogs_views.delete_comment, name='delete_comment'),# Delete a comment

    # Portfolio
    path('portfolio/', portfolio_views.portfolio, name='portfolio'),# Get user portfolio
    path('portfolio/add/', portfolio_views.add_holding, name='add_holding'),# Add a new holding
    path('portfolio/history/', portfolio_views.portfolio_history, name='portfolio_history'),# Get portfolio history
    path('profile/api-keys/', portfolio_views.manage_api_keys, name='manage_api_keys'),# Manage API keys

    # Search
    path('api/search/', search_views.search, name='search'),# Search blogs
    path('api/profile/<int:user_id>/', search_views.get_user_profile, name='search_user_profile'), # Get user profile
    path('api/profile/<int:user_id>/posts/', search_views.get_user_posts, name='search_user_posts'), # Get user posts

    # Public user profile & posts
    path('user/profile/<int:user_id>/', user_views.get_user_profile, name='get_user_profile'),# Get public user profile
    path('user/<int:user_id>/posts/', user_views.get_user_posts, name='get_user_posts'),# Get public user posts

    # Bookmarking
    path('add-bookmark/<int:blog_id>/', views.add_bookmark, name='add_bookmark'),# Add a bookmark
    path('remove-bookmark/<int:blog_id>/', views.remove_bookmark, name='remove_bookmark'), # Remove a bookmark

    # Follow/unfollow
    path('follow/<int:user_id>/', follow_views.follow_user, name='follow_user'),#  Follow a user
    path('unfollow/<int:user_id>/', follow_views.unfollow_user, name='unfollow_user'),# Unfollow a user
    path('user/<int:user_id>/followers/', follow_views.user_followers, name='user_followers'),# Get user followers
    path('user/<int:user_id>/following/', follow_views.user_following, name='user_following'),# Get users followed by user
    
    # News
    path('news/', news_views.crypto_news, name='crypto_news'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)