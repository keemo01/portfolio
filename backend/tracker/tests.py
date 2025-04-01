from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.urls import reverse

# Import models for portfolio tests
from tracker.models import PortfolioHolding, APIKey

class AuthenticationTests(TestCase):
    """Testing authentication flows like signup, login, logout, and token validation."""

    def setUp(self):
        """Set up a test user and API client before running tests."""
        self.client = APIClient()

        # Create a test user
        self.user = User.objects.create_user(
            username="testuser", 
            email="testuser@example.com", 
            password="testpassword123"
        )
        self.user.save()

        # Obtain JWT access token from renamed login endpoint:
        response = self.client.post(reverse("login"), {
            "username": "testuser",
            "password": "testpassword123"
        }, format="json")
        self.access_token = response.data.get('token')
        self.refresh_token = response.data.get('refresh_token', '')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

        # Debugging: Make sure the user and token are created
        print("Test User Created:", User.objects.count())
        print("Test Token Created:", Token.objects.count())

    def test_signup(self):
        """Make sure new users can sign up and get a token."""
        # Remove credentials so that signup works for anonymous users
        self.client.credentials()
        response = self.client.post(reverse("signup"), {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpassword123'
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Updated assertion for JWT key name
        self.assertIn('token', response.data)
        # Restore credentials if needed
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_login(self):
        """Check if an existing user can log in successfully."""
        response = self.client.post(reverse("login"), {
            'username': 'testuser',
            'password': 'testpassword123'
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_invalid_login(self):
        """Ensure login fails with incorrect credentials."""
        response = self.client.post(reverse("token_obtain_pair"), {
            'username': 'testuser',
            'password': 'wrongpassword'
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout(self):
        """Verify that logging out works as expected."""
        response = self.client.post(reverse("auth_logout"))
        print("Logout Response:", response.status_code, response.data)  # Debugging
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_token_validation(self):
        """Make sure the token validation endpoint returns the correct user."""
        response = self.client.get(reverse("auth_token_validation"))
        print("Token Validation Response:", response.status_code, response.data)  # Debugging
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'testuser')

    def test_change_password(self):
        """Check if users can change their password and log in with the new one."""
        response = self.client.post(reverse("change_password"), {
            'old_password': 'testpassword123',
            'new_password': 'newpassword456'
        }, format="json")
        print("Change Password Response:", response.status_code, response.data)  # Debugging
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Make sure the user can log in with the new password
        login_response = self.client.post(reverse("token_obtain_pair"), {
            'username': 'testuser',
            'password': 'newpassword456'
        }, format="json")
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

class PortfolioTests(TestCase):
    """Testing portfolio-related endpoints like adding holdings and managing API keys."""

    def setUp(self):
        """Create a test user and API client for portfolio-related tests."""
        self.client = APIClient()

        # Create a new test user for portfolio testing
        self.user = User.objects.create_user(
            username="portfoliouser",
            email="portfoliouser@example.com",
            password="portfoliopassword"
        )
        self.user.save()

        # Obtain JWT access token for this user:
        response = self.client.post(reverse("login"), {
            'username': 'portfoliouser',
            'password': 'portfoliopassword'
        }, format="json")
        self.access_token = response.data.get('token')
        self.refresh_token = response.data.get('refresh_token', '')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def test_add_holding(self):
        """Check if users can add a crypto holding to their portfolio."""
        data = {"coin": "BTC", "amount": "0.5", "purchase_price": "40000"}
        response = self.client.post(reverse("add_holding"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PortfolioHolding.objects.filter(user=self.user).count(), 1)

    def test_portfolio_without_api_keys(self):
        """Make sure users can't view their portfolio without setting up API keys."""
        response = self.client.get(reverse("portfolio"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('has_api_keys', response.data)
        self.assertFalse(response.data.get('has_api_keys', True))

    def test_manage_api_keys_post_and_get(self):
        """Test saving and retrieving API keys."""
        # Send a POST request to save API keys
        data = {
            'binance_api_key': 'dummybinanceapikey',
            'binance_secret_key': 'dummybinancesecret',
            'bybit_api_key': 'dummybybitapikey',
            'bybit_secret_key': 'dummybybitsecret'
        }
        post_response = self.client.post(reverse("manage_api_keys"), data, format="json")
        self.assertEqual(post_response.status_code, status.HTTP_200_OK)

        # Send a GET request to retrieve the stored API keys
        get_response = self.client.get(reverse("manage_api_keys"))
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertIn('binance_api_key', get_response.data)
        self.assertTrue(get_response.data.get('has_api_keys', False))
