from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static

# Correct the import to reflect the right path
from tracker.views import user_views as views

def home(request):
    return HttpResponse("Welcome to the Crypto Portfolio Tracker API! Visit /api/coins/ for coin data.")

urlpatterns = [
    path('', home, name='home'),  # home URL
    path('admin/', admin.site.urls),  # Admin interface
    path('api/', include('tracker.urls')),  # Include routes from the tracker app
    re_path('login', views.login),
    re_path('signup', views.signup),
    re_path('test_token', views.test_token),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
