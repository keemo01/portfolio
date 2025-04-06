import hashlib
from venv import logger
from django.db import models
from django.contrib.auth.models import User
import base64
from cryptography.fernet import Fernet
from django.conf import settings
import secrets
from django.core.exceptions import ValidationError
import os
import logging

logger = logging.getLogger(__name__)

class EncryptedTextField(models.TextField):
    """Custom field type that automatically encrypts/decrypts data"""
    def get_fernet(self):
        try:
            encryption_key = os.environ.get('DJANGO_ENCRYPTION_KEY')
            if not encryption_key:
                raise ValidationError("DJANGO_ENCRYPTION_KEY not set in environment variables")
            return Fernet(encryption_key.encode())
        except Exception as e:
            logger.error(f"Error initializing Fernet: {str(e)}")
            raise ValidationError("Error with encryption configuration")

    def from_db_value(self, value, expression, connection):
        if value is None or value == '':
            return value
        try:
            fernet = self.get_fernet()
            return fernet.decrypt(value.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption error for field: {str(e)}")
            return None

    def get_prep_value(self, value):
        if value is None or value == '':
            return value
        try:
            fernet = self.get_fernet()
            return fernet.encrypt(str(value).encode()).decode()
        except Exception as e:
            logger.error(f"Encryption error for field: {str(e)}")
            raise ValidationError("Error encrypting value")

from django.db import models
from django.contrib.auth.models import User

# Blog-related models for content management
class Blog(models.Model):
    """The main structure for a blog post, including details like the title, body, and date"""
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class BlogMedia(models.Model):
    """Manages media files linked to blog posts"""
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='media')
    file = models.FileField(upload_to='blog_media/')  # Stores images/videos

    def __str__(self):
        return f"Media for {self.blog.title}"


class Comment(models.Model):
    """
    Creates a comment system using  parent-child links.
    """
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE) 
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment by {self.author} on {self.blog.title}'


# Portfolio-related models for crypto
class PortfolioHolding(models.Model):
    """
    Keeps track of manually added crypto holdings, including purchase details. 
    Uses precise decimal values to ensure accurate calculations
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='holdings')
    coin = models.CharField(max_length=10)  # e.g. BTC, ETH, XRP etc.
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    purchase_price = models.DecimalField(max_digits=20, decimal_places=8)  # price at purchase time (in USD or USDT)
    purchase_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.coin} - {self.amount}"

class APIKey(models.Model):
    """
    Stores API credentials for different crypto exchanges, linked to a user.
    Each user can have separate API keys for Binance and Bybit.
    """
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='api_keys')
    
    # Encrypted fields for API keys
    binance_api_key = EncryptedTextField(blank=True, default='')
    binance_secret_key = EncryptedTextField(blank=True, default='')
    bybit_api_key = EncryptedTextField(blank=True, default='')
    bybit_secret_key = EncryptedTextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Ensure empty strings are stored consistently"""
        # Convert empty strings to None
        self.binance_api_key = self.binance_api_key or ''
        self.binance_secret_key = self.binance_secret_key or ''
        self.bybit_api_key = self.bybit_api_key or ''
        self.bybit_secret_key = self.bybit_secret_key or ''

    def save(self, *args, **kwargs):
        self.clean()  # Call the clean method to ensure consistent storage
        super().save(*args, **kwargs)

    @property
    def has_binance(self):
        """Check if Binance keys are configured"""
        return bool(self.binance_api_key and self.binance_secret_key)

    @property
    def has_bybit(self):
        """Check if Bybit keys are configured"""
        return bool(self.bybit_api_key and self.bybit_secret_key)

    class Meta:
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'

    def __str__(self):
        return f"API Keys for {self.user.username}"

class PortfolioHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    total_value = models.DecimalField(max_digits=20, decimal_places=2)
    coin_values = models.JSONField(default=dict, null=True)
    active_exchanges = models.JSONField(default=list, help_text="List of active exchanges when this record was created")

    def clean(self):
        if self.coin_values:
            self.coin_values = {k: v for k, v in self.coin_values.items() if v > 0}
            
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp'])
        ]