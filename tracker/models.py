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

class Like(models.Model):
    """Tracks user likes on blog posts with unique constraint"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'blog')

class Comment(models.Model):
    """
    Creates a comment system using self-referential parent-child links.
    """
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE) 
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment by {self.author} on {self.blog.title}'

class SavedPost(models.Model):
    """Tracks user bookmarks with unique constraint per user-blog pair"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='saves')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'blog')

# Portfolio-related models for crypto
class PortfolioHolding(models.Model):
    """
    Stores manual cryptocurrency holdings with purchase information
    Uses high-precision decimal fields for accurate calculations
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
    Stores exchange API credentials per user
    Supports multiple exchanges with separate key pairs
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='api_keys')
    binance_api_key = models.CharField(max_length=255, blank=True, null=True)
    binance_secret_key = models.CharField(max_length=255, blank=True, null=True)
    bybit_api_key = models.CharField(max_length=255, blank=True, null=True)
    bybit_secret_key = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'

    def __str__(self):
        return f"API Keys for {self.user.username}"

class PortfolioHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    total_value = models.DecimalField(max_digits=20, decimal_places=2)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp'])
        ]