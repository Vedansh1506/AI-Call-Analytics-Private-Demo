from sqlalchemy.orm import Session
from models.model import AuthUser


def create_auth_user(db: Session, user_data: dict) -> AuthUser:
    user = AuthUser(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_user_by_email(db: Session, email: str) -> AuthUser | None:
    return db.query(AuthUser).filter(AuthUser.email == email).first()


def get_auth_user_by_id(db: Session, user_id: int) -> AuthUser | None:
    return db.query(AuthUser).filter(AuthUser.id == user_id).first()


def get_all_auth_users(db: Session):
    return db.query(AuthUser).all()


def update_auth_user(db: Session, user: AuthUser, update_data: dict) -> AuthUser:
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def delete_auth_user(db: Session, user: AuthUser) -> None:
    db.delete(user)
    db.commit()
