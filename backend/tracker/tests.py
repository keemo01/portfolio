import logging
logging.getLogger('django.server').setLevel(logging.WARNING)

from django.urls import reverse
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

# Test settings for the Django REST Framework
# to disable migrations and use an in-memory SQLite database
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

        # Test user data
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

        # Check that we can refresh the token
        resp = self.client.post(self.logout_url, {'refresh': refresh_token})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get('detail'), 'Logout successful')

        # Check that token cannot refresh again
        resp2 = self.client.post(self.refresh_url, {'refresh': refresh_token})
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)

##############################
# Portfolio tests
##############################