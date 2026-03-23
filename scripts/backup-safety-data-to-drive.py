#!/usr/bin/env python
"""Export Safety App Firebase data to local archive storage and Google Drive."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import zipfile
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, db
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


DEFAULT_PROJECT_ID = "jmart-steel-safety"
DEFAULT_DATABASE_URL = "https://jmart-steel-safety-default-rtdb.asia-southeast1.firebasedatabase.app/"
DEFAULT_DRIVE_FOLDER_NAME = "JMart Safety Backups"
EXPORT_PATHS = OrderedDict(
    [
        ("jmart-safety/forms", "forms.json"),
        ("jmart-safety/formAssets", "form-assets.json"),
        ("jmart-safety/sites", "sites.json"),
        ("jmart-safety/jobs", "jobs.json"),
        ("jmart-safety/training", "training.json"),
        ("jmart-safety/config", "config.json"),
        ("signatures", "signatures.json"),
    ]
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export Safety App Firebase data to a timestamped archive and upload it to Google Drive."
    )
    parser.add_argument("--project", default=DEFAULT_PROJECT_ID, help="Firebase project id.")
    parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL, help="Firebase Realtime Database URL.")
    parser.add_argument("--firebase-credentials", help="Path to the Firebase Admin SDK JSON file.")
    parser.add_argument("--drive-credentials", help="Path to the Google Drive service-account JSON file.")
    parser.add_argument("--output-root", help="Local folder to store backup archives.")
    parser.add_argument("--drive-sync-root", help="Google Drive for Desktop folder to copy the archive into.")
    parser.add_argument("--drive-folder-name", default=DEFAULT_DRIVE_FOLDER_NAME, help="Drive folder name for archives.")
    parser.add_argument("--drive-folder-id", help="Drive folder id to upload into instead of creating/finding by name.")
    parser.add_argument("--drive-parent-id", help="Optional parent Drive folder id for the backup folder.")
    parser.add_argument("--force-drive-api", action="store_true", help="Use Drive API upload instead of a local Drive sync folder.")
    parser.add_argument("--skip-drive", action="store_true", help="Create the local archive only.")
    return parser.parse_args()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def desktop_root() -> Path:
    return repo_root().parents[2]


def default_backup_root() -> Path:
    return desktop_root() / "backups" / "safety-app"


def default_drive_sync_root() -> Path | None:
    candidates = [
        Path("G:/My Drive/JMart Steel/Safety App Backups"),
        Path("G:/My Drive/JMart Safety Backups"),
    ]
    for candidate in candidates:
        if candidate.parent.exists():
            return candidate
    return None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def timestamp_slug() -> str:
    return utc_now().strftime("%Y-%m-%dT%H%M%SZ")


def sanitize_for_filename(path_value: str) -> str:
    return path_value.replace("/", "__").replace("\\", "__")


def count_items(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, (list, dict, tuple, set)):
        return len(value)
    return 1


def json_dump(path_value: Path, payload: Any) -> None:
    path_value.write_text(
        json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False),
        encoding="utf-8",
    )


def candidate_secret_paths(filename: str) -> list[Path]:
    return [
        Path(os.environ.get("USERPROFILE", str(Path.home()))) / ".secrets" / "jmart-openclaw" / filename,
        desktop_root() / filename,
        repo_root() / filename,
    ]


def find_firebase_credentials(explicit_path: str | None) -> Path:
    candidates: list[Path] = []
    if explicit_path:
        candidates.append(Path(explicit_path))

    for env_name in (
        "JMART_FIREBASE_ADMINSDK_PATH",
        "JMART_SAFETY_FIREBASE_SERVICE_ACCOUNT",
        "GOOGLE_APPLICATION_CREDENTIALS",
    ):
        env_value = os.environ.get(env_name)
        if env_value:
            candidates.append(Path(env_value))

    candidates.extend(candidate_secret_paths("firebase-adminsdk.json"))
    candidates.append(desktop_root() / "jmart-steel-safety-firebase-adminsdk-fbsvc-900d3eb612.json")

    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate

    raise FileNotFoundError(
        "No Firebase Admin SDK JSON found. Set JMART_FIREBASE_ADMINSDK_PATH or pass --firebase-credentials."
    )


def find_drive_credentials(explicit_path: str | None) -> Path:
    candidates: list[Path] = []
    if explicit_path:
        candidates.append(Path(explicit_path))

    for env_name in (
        "JMART_DRIVE_SERVICE_ACCOUNT_PATH",
        "JMART_SHARED_SERVICE_ACCOUNT_PATH",
        "GOOGLE_APPLICATION_CREDENTIALS",
    ):
        env_value = os.environ.get(env_name)
        if env_value:
            candidates.append(Path(env_value))

    candidates.extend(candidate_secret_paths("shared-service-account.json"))

    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate

    raise FileNotFoundError(
        "No Drive service-account JSON found. Set JMART_DRIVE_SERVICE_ACCOUNT_PATH or pass --drive-credentials."
    )


def initialize_firebase(creds_path: Path, database_url: str):
    app_name = "safety-backup-export"
    try:
        return firebase_admin.get_app(app_name)
    except ValueError:
        return firebase_admin.initialize_app(
            credentials.Certificate(str(creds_path)),
            {"databaseURL": database_url},
            name=app_name,
        )


def export_database_data(app, snapshot_dir: Path) -> dict[str, Any]:
    exports: list[dict[str, Any]] = []
    for database_path, filename in EXPORT_PATHS.items():
        payload = db.reference("/" + database_path, app=app).get()
        output_path = snapshot_dir / filename
        json_dump(output_path, payload)
        exports.append(
            {
                "databasePath": database_path,
                "filename": filename,
                "items": count_items(payload),
                "bytes": output_path.stat().st_size,
            }
        )
    return {"exports": exports}


def write_manifest(snapshot_dir: Path, args: argparse.Namespace, export_summary: dict[str, Any]) -> Path:
    manifest = {
        "createdAt": utc_now().isoformat().replace("+00:00", "Z"),
        "project": args.project,
        "databaseURL": args.database_url,
        "localFolder": str(snapshot_dir),
        **export_summary,
    }
    manifest_path = snapshot_dir / "manifest.json"
    json_dump(manifest_path, manifest)
    return manifest_path


def zip_snapshot(snapshot_dir: Path, output_root: Path) -> Path:
    zip_path = output_root / (snapshot_dir.name + ".zip")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in sorted(snapshot_dir.rglob("*")):
            if file_path.is_file():
                archive.write(file_path, arcname=file_path.relative_to(snapshot_dir))
    return zip_path


def copy_archive_to_drive_sync(archive_path: Path, drive_sync_root: Path) -> dict[str, Any]:
    year_folder = drive_sync_root / str(utc_now().year)
    year_folder.mkdir(parents=True, exist_ok=True)
    destination = year_folder / archive_path.name
    shutil.copy2(archive_path, destination)
    return {
        "mode": "desktop-sync",
        "destination": str(destination),
        "folder": str(year_folder),
    }


def build_drive_service(creds_path: Path):
    creds = service_account.Credentials.from_service_account_file(
        str(creds_path),
        scopes=["https://www.googleapis.com/auth/drive"],
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def drive_query_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def find_drive_folder(service, folder_name: str, parent_id: str | None = None) -> dict[str, Any] | None:
    clauses = [
        f"name = '{drive_query_escape(folder_name)}'",
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
    ]
    if parent_id:
        clauses.append(f"'{parent_id}' in parents")

    response = (
        service.files()
        .list(
            q=" and ".join(clauses),
            spaces="drive",
            fields="files(id,name,parents,webViewLink)",
            pageSize=10,
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
        )
        .execute()
    )
    files = response.get("files", [])
    return files[0] if files else None


def create_drive_folder(service, folder_name: str, parent_id: str | None = None) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]
    return (
        service.files()
        .create(
            body=metadata,
            fields="id,name,parents,webViewLink",
            supportsAllDrives=True,
        )
        .execute()
    )


def ensure_drive_folder(service, folder_name: str, parent_id: str | None = None) -> dict[str, Any]:
    existing = find_drive_folder(service, folder_name, parent_id=parent_id)
    if existing:
        return existing
    return create_drive_folder(service, folder_name, parent_id=parent_id)


def upload_archive_to_drive(
    service,
    archive_path: Path,
    drive_folder_id: str | None,
    drive_folder_name: str,
    drive_parent_id: str | None,
) -> dict[str, Any]:
    root_folder = (
        {"id": drive_folder_id, "name": drive_folder_name}
        if drive_folder_id
        else ensure_drive_folder(service, drive_folder_name, parent_id=drive_parent_id)
    )
    year_folder = ensure_drive_folder(service, str(utc_now().year), parent_id=root_folder["id"])

    media = MediaFileUpload(str(archive_path), mimetype="application/zip", resumable=False)
    metadata = {
        "name": archive_path.name,
        "parents": [year_folder["id"]],
    }
    uploaded = (
        service.files()
        .create(
            body=metadata,
            media_body=media,
            fields="id,name,parents,webViewLink",
            supportsAllDrives=True,
        )
        .execute()
    )
    uploaded["folderId"] = year_folder["id"]
    uploaded["folderName"] = year_folder["name"]
    uploaded["rootFolderId"] = root_folder["id"]
    uploaded["rootFolderName"] = root_folder["name"]
    return uploaded


def main() -> int:
    args = parse_args()

    output_root = Path(args.output_root or os.environ.get("JMART_SAFETY_BACKUP_ROOT") or default_backup_root()).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    drive_sync_root = args.drive_sync_root or os.environ.get("JMART_SAFETY_BACKUP_DRIVE_ROOT")
    if not drive_sync_root:
        default_sync_root = default_drive_sync_root()
        if default_sync_root is not None:
            drive_sync_root = str(default_sync_root)

    firebase_creds_path = find_firebase_credentials(args.firebase_credentials)
    snapshot_name = f"safety-app-backup-{timestamp_slug()}"
    snapshot_dir = output_root / snapshot_name
    snapshot_dir.mkdir(parents=True, exist_ok=False)

    app = initialize_firebase(firebase_creds_path, args.database_url)
    export_summary = export_database_data(app, snapshot_dir)
    manifest_path = write_manifest(snapshot_dir, args, export_summary)
    archive_path = zip_snapshot(snapshot_dir, output_root)

    result: dict[str, Any] = {
        "project": args.project,
        "databaseURL": args.database_url,
        "snapshotDir": str(snapshot_dir),
        "manifest": str(manifest_path),
        "archive": str(archive_path),
        "driveUpload": None,
        "exports": export_summary["exports"],
    }

    if not args.skip_drive:
        if drive_sync_root and not args.force_drive_api:
            result["driveUpload"] = copy_archive_to_drive_sync(archive_path, Path(drive_sync_root))
        else:
            drive_creds_path = find_drive_credentials(args.drive_credentials)
            drive_service = build_drive_service(drive_creds_path)
            drive_upload = upload_archive_to_drive(
                drive_service,
                archive_path=archive_path,
                drive_folder_id=args.drive_folder_id,
                drive_folder_name=args.drive_folder_name,
                drive_parent_id=args.drive_parent_id,
            )
            result["driveUpload"] = drive_upload

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[backup-safety-data-to-drive] {exc}", file=sys.stderr)
        raise
