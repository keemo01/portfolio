from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from .views.user_views import (
    change_password, signup, login, logout, 
    user_profile, test_token,
)

from .views.blogs_views import (
    get_blogs, create_blog, delete_blog, 
    blog_detail, user_blogs,
    blog_comments, delete_comment,
)

from .views.portfolio_views import (
    portfolio, add_holding, manage_api_keys,
)
                    
urlpatterns = [
    # User authentication routes
    path('signup/', signup, name='signup'),  # Route to sign up a new user
    path('login/', login, name='login'),  # Route to log in an existing user
    path('logout/', logout, name='logout'),  # Route to log out the user
    
    # Blog-related routes
    path('blogs/', get_blogs, name='get_blogs'),  # Route to get a list of blogs
    path('blogs/<int:pk>/', blog_detail, name='blog_detail'),  # Route to view a specific blog by its ID
    path('blogs/create/', create_blog, name='create_blog'),  # Route to create a new blog post
    path('blogs/delete/<int:blog_id>/', delete_blog, name='delete_blog'),  # Route to delete a blog post
    path('blogs/<int:blog_id>/comments/', blog_comments, name='blog_comments'),  # Route to view comments on a blog post
    
    # User profile routes
    path('profile/', user_profile, name='user_profile'),  # Route to view user profile
    path('change-password/', change_password, name='change_password'),  # Route to change user password
    path('user-blogs/', user_blogs, name='user_blogs'),  # Route to view the user's blogs
    
    # Comment management route
    path('comments/<int:comment_id>/', delete_comment, name='delete_comment'),  # Route to delete a specific comment
    
    # Token testing route
    path('test-token/', test_token, name='test_token'),  # Route for token testing
    
    # Portfolio-related routes
    path('portfolio/', portfolio, name='portfolio'),  # Route to view the user's portfolio
    path('portfolio/add/', add_holding, name='add_holding'),  # Route to add a new holding to the portfolio
    path('profile/api-keys/', manage_api_keys, name='manage_api_keys'),  # Route to manage API keys in user profile
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
