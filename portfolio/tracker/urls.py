# tracker/urls.py
from django.urls import path
from .views import signup, login, get_blogs, create_blog, delete_blog, blog_detail

urlpatterns = [
    path('signup/', signup, name='signup'),
    path('login/', login, name='login'),
    path('blogs/', get_blogs, name='get_blogs'),
    path('blogs/<int:pk>/', blog_detail, name='blog_detail'),  # Add this line
    path('blogs/create/', create_blog, name='create_blog'),
    path('blogs/delete/<int:blog_id>/', delete_blog, name='delete_blog'),
]