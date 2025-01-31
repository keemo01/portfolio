from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse

from tracker import views

def home(request):
    return HttpResponse("Welcome to the Crypto Portfolio Tracker API! Visit /api/coins/ for coin data.")

# Most important url as its needed to login signup etc

urlpatterns = [
    path('', home, name='home'),  #home URL
    path('admin/', admin.site.urls),  # The Admin interface
    path('api/', include('tracker.urls')),  # Include routes from the tracker app
    re_path('login', views.login),
    re_path('signup', views.signup),
    re_path('test_token', views.test_token),

    
]
