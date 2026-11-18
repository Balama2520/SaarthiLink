"""Assign a persisted Saarthi account role from an operator-controlled shell."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.connection import SessionLocal
from app.repositories.user_repository import UserRepository


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("username", help="Existing account username")
    parser.add_argument("role", choices=("admin", "user"), help="Role to assign")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = UserRepository(db).get_user_by_username(args.username)
        if user is None:
            parser.error("No account exists with that username.")
        user.role = args.role
        db.commit()
        print(f"Updated account {user.username!r} to role {user.role!r}.")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
