from background_services.celery_app import celery_app
from background_services.process_asset import process_asset


@celery_app.task(
    bind=True,
)
def process_asset_task(self, asset_id: int):
    process_asset(asset_id)
