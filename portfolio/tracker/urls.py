from django.urls import path
from .views import signup, login, get_blogs, create_blog, delete_blog

urlpatterns = [
    path('signup/', signup, name='signup'),
    path('login/', login, name='login'),
    path('blogs/', get_blogs, name='get_blogs'),  # This should match frontend requests
    path('blogs/create/', create_blog, name='create_blog'),
    path('blogs/delete/<int:blog_id>/', delete_blog, name='delete_blog'),
]
