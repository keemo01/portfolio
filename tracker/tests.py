import logging

from tracker.models import Blog, Comment, PortfolioHistory, PortfolioHolding
logging.getLogger('django.server').setLevel(logging.WARNING)

from django.urls import reverse
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

# Test settings
class DisableMigrations(dict):
    def __contains__(self, item):
        return True
    def __getitem__(self, item):
        return None

@override_settings(
    MIGRATION_MODULES=DisableMigrations(),
    DATABASES={
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
)
class UserAuthTests(APITestCase):
    def setUp(self):
        # Suppress test output
        print(f"\n=== START {self._testMethodName} ===")
        # Set up URLs for the tests
        self.signup_url     = reverse('signup')
        self.login_url      = reverse('token_obtain_pair')
        self.refresh_url    = reverse('token_refresh')
        self.logout_url     = reverse('logout')
        self.test_token_url = reverse('test_token')

        # Tests user data
        self.username  = 'alice'
        self.password  = 'Secret123!'
        self.firstName = 'Alice'
        self.lastName  = 'Wonder'

    def test_signup(self):
        """POST /auth/signup/ → 201 + tokens + user data."""
        payload = {
            'username':  self.username,
            'email':     'alice@example.com',
            'password':  self.password,
            'firstName': self.firstName,
            'lastName':  self.lastName
        }
        resp = self.client.post(self.signup_url, payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('access',  resp.data)
        self.assertIn('refresh', resp.data)

        user = resp.data['user']
        self.assertEqual(user['username'],  self.username)
        self.assertEqual(user['firstName'], self.firstName)
        self.assertEqual(user['lastName'],  self.lastName)

    def test_login(self):
        """POST /auth/login/ → 200 + tokens for existing user."""
        # Create a user
        self.client.post(self.signup_url, {
            'username':  self.username,
            'email':     'alice2@example.com',
            'password':  self.password,
            'firstName': self.firstName,
            'lastName':  self.lastName
        })

        resp = self.client.post(self.login_url, {
            'username': self.username,
            'password': self.password
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access',  resp.data)
        self.assertIn('refresh', resp.data)

    def test_public_refresh(self):
        """POST /auth/refresh/ with only a refresh token → 200."""
        bob = User.objects.create_user(username='bob', password='pw')
        bob_refresh = RefreshToken.for_user(bob)
        resp = self.client.post(self.refresh_url, {'refresh': str(bob_refresh)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access',  resp.data)
        self.assertIn('refresh', resp.data)

    def test_protected_endpoint_requires_access(self):
        """GET /auth/test-token/ must return 401 without a valid access token."""
        # No token
        resp = self.client.get(self.test_token_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Invalid token
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token')
        resp2 = self.client.get(self.test_token_url)
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_and_blacklist(self):
        """
        Full flow:
          1) signup → login → get refresh
          2) logout(refresh) → 200
          3) refresh with same token → 401
        """
        # Create a user and login to get tokens
        self.client.post(self.signup_url, {
            'username':  self.username,
            'email':     'alice3@example.com',
            'password':  self.password,
            'firstName': self.firstName,
            'lastName':  self.lastName
        })
        login_data = self.client.post(self.login_url, {
            'username': self.username,
            'password': self.password
        }).data
        refresh_token = login_data['refresh']

        # Logout using the refresh token
        resp = self.client.post(self.logout_url, {'refresh': refresh_token})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get('detail'), 'Logout successful')

        # Try to refresh the token again
        resp2 = self.client.post(self.refresh_url, {'refresh': refresh_token})
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)

##############################
# Portfolio tests
##############################


class PortfolioTests(APITestCase):
    def setUp(self):
        # create and authenticate user
        self.user = User.objects.create_user(username='test', password='pass')
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        
        # endpoints
        self.add_url = reverse('add_holding')
        self.portfolio_url = reverse('portfolio')
        self.history_url = reverse('portfolio_history')
        self.keys_url = reverse('manage_api_keys')

    def test_add_holding_success(self):
        data = {'coin': 'BTC', 'amount': '0.5', 'purchase_price': '40000'}
        resp = self.client.post(self.add_url, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PortfolioHolding.objects.filter(user=self.user).count(), 1)

    def test_add_holding_missing_fields(self):
        resp = self.client.post(self.add_url, {'coin': 'ETH'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', resp.data)

    def test_get_portfolio_empty(self):
        resp = self.client.get(self.portfolio_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['portfolio'], [])
        self.assertFalse(resp.data['has_api_keys'])

    def test_portfolio_with_manual(self):
        # add manual holding directly
        PortfolioHolding.objects.create(user=self.user, coin='ETH', amount=1, purchase_price=2000)
        resp = self.client.get(self.portfolio_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['portfolio'])
        self.assertEqual(len(resp.data['portfolio']), 1)
        item = resp.data['portfolio'][0]
        self.assertEqual(item['coin'], 'ETH')
        self.assertIn('current_value', item)

    def test_portfolio_history_defaults(self):
        # create a history record
        PortfolioHistory.objects.create(user=self.user, total_value=1000, coin_values={'BTC':1000}, active_exchanges=['manual'])
        resp = self.client.get(self.history_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('history', resp.data)
        self.assertGreaterEqual(len(resp.data['history']), 1)

    def test_manage_api_keys_crud(self):
        # initially no keys
        resp = self.client.get(self.keys_url)
        self.assertFalse(resp.data['has_api_keys'])

        # add binance keys
        resp2 = self.client.post(self.keys_url, {'binance_api_key':'key','binance_secret_key':'secret'})
        self.assertTrue(resp2.data['has_api_keys'])
        self.assertIn('binance', resp2.data['active_exchanges'])

        # delete binance keys
        resp3 = self.client.delete(self.keys_url, {'exchange':'binance'})
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        self.assertFalse(resp3.data['binance_api_key'])

        # add bybit keys
        resp4 = self.client.post(self.keys_url, {'bybit_api_key':'bkey','bybit_secret_key':'bsecret'})
        self.assertTrue(resp4.data['has_api_keys'])
        self.assertIn('bybit', resp4.data['active_exchanges'])
        
####################
# BLOG TESTS
####################
class BlogTests(APITestCase):
    def setUp(self):
        # create and authenticate user
        self.user = User.objects.create_user(username='bob', password='pass')
        token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # endpoints
        self.list_url    = reverse('get_blogs')
        self.create_url  = reverse('create_blog')
        self.detail_url  = lambda pk: reverse('blog_detail', args=[pk])
        self.delete_url  = lambda pk: reverse('delete_blog', args=[pk])
        self.user_url    = reverse('user_blogs')
        self.comments_url = lambda pk: reverse('blog_comments', args=[pk])
        self.delete_comment_url = lambda cid: reverse('delete_comment', args=[cid])
        self.like_url    = lambda pk: reverse('like_post', args=[pk])
        self.count_url   = lambda pk: reverse('blog_like_count', args=[pk])
        self.add_bm_url  = lambda pk: reverse('add_bookmark', args=[pk])
        self.list_bm_url = reverse('user_bookmarks')
        self.remove_bm_url = lambda pk: reverse('remove_bookmark', args=[pk])

    def test_get_blogs_empty(self):
        resp = self.client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_create_and_list_blog(self):
        # create
        payload = {'title':'Hello','content':'World'}
        resp = self.client.post(self.create_url, payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        blog_id = resp.data['id']

        # list
        resp2 = self.client.get(self.list_url)
        self.assertEqual(len(resp2.data), 1)
        self.assertEqual(resp2.data[0]['id'], blog_id)

    def test_blog_detail_and_404(self):
        # no such blog
        resp = self.client.get(self.detail_url(999))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        # create & fetch
        blog = Blog.objects.create(author=self.user, title='T', content='C')
        resp2 = self.client.get(self.detail_url(blog.pk))
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data['title'], 'T')

    def test_delete_blog_permission(self):
        other = User.objects.create_user('jane', 'jane@example.com', 'pw')
        blog = Blog.objects.create(author=other, title='X', content='Y')
        resp = self.client.delete(self.delete_url(blog.pk))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_blog_success(self):
        blog = Blog.objects.create(author=self.user, title='A', content='B')
        resp = self.client.delete(self.delete_url(blog.pk))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Blog.objects.filter(pk=blog.pk).exists())

    def test_user_blogs_count(self):
        # create 2 blogs
        Blog.objects.create(author=self.user, title='1', content='c1')
        Blog.objects.create(author=self.user, title='2', content='c2')
        resp = self.client.get(self.user_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)
        self.assertEqual(len(resp.data['blogs']), 2)

    def test_comments_flow(self):
        blog = Blog.objects.create(author=self.user, title='Z', content='z')
        # no comments yet
        resp = self.client.get(self.comments_url(blog.pk))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

        # post comment
        resp2 = self.client.post(self.comments_url(blog.pk), {'content':'hey'})
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        comment_id = resp2.data['id']

        # now GET shows one
        resp3 = self.client.get(self.comments_url(blog.pk))
        self.assertEqual(len(resp3.data), 1)
        self.assertEqual(resp3.data[0]['id'], comment_id)

    def test_delete_comment_permission(self):
        blog = Blog.objects.create(author=self.user, title='T', content='t')
        comment = Comment.objects.create(blog=blog, author=self.user, content='x')
        # delete with no token
        other = User.objects.create_user('u2', 'u2@example.com', 'p')
        token2 = RefreshToken.for_user(other).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token2}')
        resp = self.client.delete(self.delete_comment_url(comment.pk))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_like_and_count_toggle(self):
        blog = Blog.objects.create(author=self.user, title='L', content='l')
        # like
        resp1 = self.client.post(self.like_url(blog.pk))
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        # count shows liked
        resp2 = self.client.get(self.count_url(blog.pk))
        body = resp2.json()
        self.assertEqual(body['like_count'], 1)
        self.assertTrue(body['liked'])

        # toggle off
        resp3 = self.client.post(self.like_url(blog.pk))
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        resp4 = self.client.get(self.count_url(blog.pk))
        body2 = resp4.json()
        self.assertEqual(body2['like_count'], 0)
        self.assertFalse(body2['liked'])

    def test_bookmark_and_list(self):
        blog = Blog.objects.create(author=self.user, title='B', content='b')
        # add
        resp1 = self.client.post(self.add_bm_url(blog.pk))
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        # list
        resp2 = self.client.get(self.list_bm_url)
        self.assertEqual(len(resp2.data), 1)
        # remove
        resp3 = self.client.delete(self.remove_bm_url(blog.pk))
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        resp4 = self.client.get(self.list_bm_url)
        self.assertEqual(resp4.data, [])