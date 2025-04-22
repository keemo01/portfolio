import logging
from celery import shared_task
from django.contrib.auth.models import User
from backend.tracker.views.portfolio_views import fetch_user_holdings
from tracker.models import PortfolioHistory

logger = logging.getLogger(__name__)

@shared_task
def update_portfolio_snapshot_30min():
    """
    Task to create a 30min snapshot for every user.
    This should run at the top and half of every hour (e.g. 1:00, 1:30, etc.)
    """
    for user in User.objects.all():
        try:
            consolidated, metrics = fetch_user_holdings(user)
            PortfolioHistory.objects.create(
                user=user,
                total_value=metrics.get('total_value', 0),
                coin_values={
                    k: float(v['total_value']) for k, v in consolidated.items()
                } if consolidated else {},
                active_exchanges=[
                    ex.lower() for ex in metrics.get('exchange_distribution', {}).keys()
                ],
                snapshot_type="30min"
            )
            logger.info("✅ Created 30min snapshot for %s", user.username)
        except Exception as e:
            logger.error("❌ Error creating 30min snapshot for %s: %s", user.username, e)

@shared_task
def update_portfolio_snapshot_daily():
    """
    Task to create a daily snapshot for every user.
    This should run at 12:00 AM daily.
    """
    for user in User.objects.all():
        try:
            consolidated, metrics = fetch_user_holdings(user)
            PortfolioHistory.objects.create(
                user=user,
                total_value=metrics.get('total_value', 0),
                coin_values={
                    k: float(v['total_value']) for k, v in consolidated.items()
                } if consolidated else {},
                active_exchanges=[
                    ex.lower() for ex in metrics.get('exchange_distribution', {}).keys()
                ],
                snapshot_type="daily"
            )
            logger.info("✅ Created daily snapshot for %s", user.username)
        except Exception as e:
            logger.error("❌ Error creating daily snapshot for %s: %s", user.username, e)
