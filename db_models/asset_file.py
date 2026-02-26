from sqlalchemy.orm import Session
from models.model import AssetFile


def create_asset_file(db: Session, asset_data: dict) -> AssetFile:
    asset = AssetFile(**asset_data)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def get_asset_file_by_id(
    db: Session,
    asset_id: int,
    user_auth_id: int
) -> AssetFile | None:
    return (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == user_auth_id
        )
        .first()
    )


def get_asset_files_by_user(db: Session, user_auth_id: int):
    return (
        db.query(AssetFile)
        .filter(AssetFile.user_auth_id == user_auth_id)
        .all()
    )


def update_asset_file(
    db: Session,
    asset: AssetFile,
    update_data: dict
) -> AssetFile:
    for key, value in update_data.items():
        setattr(asset, key, value)

    db.commit()
    db.refresh(asset)
    return asset


def delete_asset_file(db: Session, asset: AssetFile) -> None:
    db.delete(asset)
    db.commit()
