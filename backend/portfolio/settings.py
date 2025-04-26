import os
import pymysql
import dj_database_url

from pathlib import Path
from corsheaders.defaults import default_headers
from datetime import timedelta
from celery.schedules import crontab
from cryptography.fernet import Fernet
from venv import logger
from dotenv import load_dotenv

# Use PyMySQL as MySQLdb
pymysql.install_as_MySQLdb()

# BASE_DIR
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env before any os.getenv() calls
load_dotenv()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "portfolio.settings")

# SECURITY
SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-1*iy9qf5otbk9t@w8fy@c&_$5sl$ean46*feqb4nf%u6zd-5y3'
)
DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',')
NEWSAPI_KEY = os.environ['NEWSAPI_KEY']


BINANCE_API_BASE    = os.getenv("BINANCE_API_BASE", "https://api.binance.com")
BINANCE_PUBLIC_BASE = os.getenv("BINANCE_PUBLIC_BASE", "https://api.binance.com")



# MEDIA
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# APPLICATIONS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'tracker',
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'rest_framework_nested',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

CORS_ALLOW_ALL_HEADERS = True

ROOT_URLCONF = 'portfolio.urls'
WSGI_APPLICATION = 'portfolio.wsgi.application'
ASGI_APPLICATION = 'portfolio.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# CHANNELS
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# REST FRAMEWORK
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# ENCRYPTION
ENCRYPTION_KEY = os.getenv('DJANGO_ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    logger.warning('Generated new encryption key – save in your .env')

try:
    Fernet(ENCRYPTION_KEY.encode())
except Exception as e:
    raise ValueError(f'Invalid encryption key format: {e}')

# CELERY
CELERY_BROKER_URL    = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULE = {
    'portfolio-hourly-snapshot': {
        'task': 'tracker.tasks.update_portfolio_snapshot',
        'schedule': 43200.0,
        'args': ('hourly',),
    },
    'portfolio-daily-snapshot': {
        'task': 'tracker.tasks.update_portfolio_snapshot',
        'schedule': crontab(hour=0, minute=0),
        'args': ('daily',),
    },
}

# DATABASE
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('JAWSDB_URL'),
        conn_max_age=600,
        ssl_require=True,
    )
}

# Heroku
heroku_url = os.getenv('JAWSDB_URL')
if heroku_url:
    parsed = dj_database_url.parse(heroku_url, conn_max_age=600, ssl_require=True)
    DATABASES['default'].update(parsed)
    # Removed sslmode for MySQL compatibility
    if DATABASES['default']['ENGINE'].endswith('mysql'):
        DATABASES['default']['OPTIONS'].pop('sslmode', None)

# CACHING
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
    }
}

# LOGGING
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'DEBUG'},
}

# SILENCE MySQL strict-mode warning
SILENCED_SYSTEM_CHECKS = ['mysql.E001']

# STATIC FILES
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'frontend/build/static',
]
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# PASSWORD VALIDATION
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# INTERNATIONALIZATION
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# CORS
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "https://cryptofront-a256c.web.app",
    "https://cryptofront-a256c.firebaseapp.com",
]
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-cg-demo-api-key",
]

# DEFAULT AUTO FIELD
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# SIMPLE JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}
