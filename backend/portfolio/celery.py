import os
import ssl
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "portfolio.settings")
app = Celery("portfolio")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.conf.broker_use_ssl = {
    "ssl_cert_reqs": ssl.CERT_NONE
    }

app.conf.result_backend_use_ssl = {
    "ssl_cert_reqs": ssl.CERT_NONE
    }


app.autodiscover_tasks()
