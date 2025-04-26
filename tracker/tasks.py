import logging
from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model

from tracker.views.portfolio_views import fetch_user_holdings
from tracker.models import PortfolioHistory

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def update_portfolio_snapshot(snapshot_type='hourly'):
    """
    Create a portfolio snapshot for all users. snapshot_type: 'hourly' or 'daily'
    """
    for user in User.objects.all():
        try:
            # Assuming fetch_user_holdings is a function that fetches the user's holdings
            result = fetch_user_holdings(user)
            if not result or len(result) != 3:
                logger.error("fetch_user_holdings returned invalid result for %s: %r", user.username, result)
                continue

            consolidated, metrics, errors = result

            PortfolioHistory.objects.create(
                user=user,
                total_value=metrics.get('total_value', 0),
                coin_values={k: float(v['total_value']) for k, v in (consolidated or {}).items()},
                active_exchanges=[ex.lower() for ex in metrics.get('exchange_distribution', {}).keys()],
                snapshot_type=snapshot_type,
                timestamp=timezone.now()
            )
            if errors:
                logger.error("❌ [%s] Errors fetching holdings for %s: %s", snapshot_type, user.username, errors)
            else:
                logger.info("✅ [%s] Created snapshot for %s", snapshot_type, user.username)
        except Exception as e:
            logger.exception("❌ [%s] Unexpected error for %s: %s", snapshot_type, user.username, e)

@shared_task
def ping():
    print("🏓 pong!")