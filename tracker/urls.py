from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Import views from specific modules
from .views import user_views, blogs_views, portfolio_views, search_views

urlpatterns = [
    # User authentication routes
    path('signup/', user_views.signup, name='signup'),  # Route to sign up a new user
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # Route to log in an existing user
    path('logout/', user_views.logout, name='logout'),  # Route to log out the user

    # User profile routes
    path('profile/', user_views.user_profile, name='user_profile'),  # Route to view user profile
    path('change-password/', user_views.change_password, name='change_password'),  # Route to change user password

    # Blog-related routes (reordered)
    path('blogs/', blogs_views.get_blogs, name='get_blogs'),
    path('blogs/create/', blogs_views.create_blog, name='create_blog'),  # Route to create a new blog post
    path('blogs/delete/<int:blog_id>/', blogs_views.delete_blog, name='delete_blog'),  # Route to delete a blog post
    path('blogs/<int:pk>/', blogs_views.blog_detail, name='blog_detail'),  # Generic blog detail view
    path('blogs/<int:blog_id>/comments/', blogs_views.blog_comments, name='blog_comments'),  # Changed pk to blog_id

    # User specific blog routes
    path('user-blogs/', user_views.user_blogs, name='user_blogs'),
    path('user-blog/<int:blog_id>/', user_views.get_user_blog, name='get-user-blog'),  # Changed path

    # Comment management route
    path('comments/<int:comment_id>/', blogs_views.delete_comment, name='delete_comment'),  # Route to delete a specific comment

    # Token testing route
    path('test-token/', user_views.test_token, name='test_token'),  # Route for token testing

    # Portfolio-related routes
    path('portfolio/', portfolio_views.portfolio, name='portfolio'),  # Route to view the user's portfolio
    path('portfolio/add/', portfolio_views.add_holding, name='add_holding'),  # Route to add a new holding to the portfolio
    path('profile/api-keys/', portfolio_views.manage_api_keys, name='manage_api_keys'),  # Route to manage API keys in user profile
    path('portfolio/history/', portfolio_views.portfolio_history, name='portfolio_history'),  # Route to view portfolio history

    # Search-related routes
    path('api/search/', search_views.search, name='search'),
    path('api/profile/<int:user_id>/', search_views.get_user_profile, name='user-profile'),
    path('api/profile/<int:user_id>/posts/', search_views.get_user_posts, name='user-posts'),

    # User profile and posts endpoints
    path('user/profile/<int:user_id>/', user_views.get_user_profile, name='user-profile'),
    path('user/<int:user_id>/posts/', user_views.get_user_posts, name='user-posts'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)