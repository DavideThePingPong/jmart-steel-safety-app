#!/usr/bin/env python
"""Reconcile legacy /jmart-safety/sites entries into /jmart-safety/jobs.

Dry-run by default. Use --write to apply missing jobs and refresh the migration flag.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, db


DEFAULT_DATABASE_URL = "https://jmart-steel-safety-default-rtdb.asia-southeast1.firebasedatabase.app/"
DEFAULT_PROJECT_ID = "jmart-steel-safety"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reconcile Firebase jobs from legacy sites data.")
    parser.add_argument("--write", action="store_true", help="Apply missing jobs to Firebase.")
    parser.add_argument("--credentials", help="Path to Firebase service-account JSON.")
    parser.add_argument("--project", default=DEFAULT_PROJECT_ID, help="Firebase project id.")
    parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL, help="Realtime Database URL.")
    return parser.parse_args()


def find_credentials(explicit_path: str | None) -> Path:
    candidates = []
    if explicit_path:
        candidates.append(Path(explicit_path))

    for env_name in ("JMART_SAFETY_FIREBASE_SERVICE_ACCOUNT", "GOOGLE_APPLICATION_CREDENTIALS"):
        env_value = os.environ.get(env_name)
        if env_value:
            candidates.append(Path(env_value))

    script_path = Path(__file__).resolve()
    workspace_root = script_path.parents[1]
    desktop_root = workspace_root.parents[2]
    candidates.extend([
        workspace_root / "firebase-adminsdk.json",
        desktop_root / "jmart-steel-safety-firebase-adminsdk-fbsvc-900d3eb612.json"
    ])

    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate

    raise FileNotFoundError("No Firebase service-account file found. Use --credentials or set JMART_SAFETY_FIREBASE_SERVICE_ACCOUNT.")


def initialize_admin(creds_path: Path, database_url: str):
    app_name = "jobs-reconcile"
    try:
        return firebase_admin.get_app(app_name)
    except ValueError:
        return firebase_admin.initialize_app(
            credentials.Certificate(str(creds_path)),
            {"databaseURL": database_url},
            name=app_name
        )


def normalize_sites(raw_sites: Any) -> list[dict[str, str]]:
    if not raw_sites:
        return []

    site_entries = raw_sites if isinstance(raw_sites, list) else list(raw_sites.values())
    normalized = []

    for site in site_entries:
        if isinstance(site, str):
            name = site.strip()
            if not name:
                continue
            normalized.append({
                "name": name,
                "client": "",
                "address": name
            })
            continue

        if not isinstance(site, dict):
            continue

        name = str(site.get("name", "")).strip()
        if not name:
            continue

        address = str(site.get("address") or name).strip() or name
        client = str(site.get("builder") or site.get("client") or "").strip()
        normalized.append({
            "name": name,
            "client": client,
            "address": address
        })

    return normalized


def normalize_name(value: str) -> str:
    return value.strip().lower()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def summarize_missing_jobs(sites: list[dict[str, str]], jobs: dict[str, Any] | None) -> list[dict[str, str]]:
    jobs = jobs or {}
    existing_names = {
        normalize_name(job.get("name", ""))
        for job in jobs.values()
        if isinstance(job, dict) and job.get("name")
    }

    missing = []
    for site in sites:
        normalized_name = normalize_name(site["name"])
        if normalized_name in existing_names:
            continue
        missing.append({
            "name": site["name"],
            "client": site["client"],
            "address": site["address"],
            "status": "active",
            "source": "reconciled-from-sites"
        })
        existing_names.add(normalized_name)

    return missing


def main() -> int:
    args = parse_args()
    creds_path = find_credentials(args.credentials)
    app = initialize_admin(creds_path, args.database_url)

    sites_ref = db.reference("/jmart-safety/sites", app=app)
    jobs_ref = db.reference("/jmart-safety/jobs", app=app)
    migration_ref = db.reference("/jmart-safety/config/jobsMigrationComplete", app=app)

    raw_sites = sites_ref.get()
    raw_jobs = jobs_ref.get()

    sites = normalize_sites(raw_sites)
    missing_jobs = summarize_missing_jobs(sites, raw_jobs)

    print(json.dumps({
        "project": args.project,
        "databaseURL": args.database_url,
        "credentials": str(creds_path),
        "sitesCount": len(sites),
        "jobsCount": len(raw_jobs or {}),
        "missingJobs": missing_jobs
    }, indent=2))

    if not args.write:
        print("")
        print("Dry run only. Re-run with --write to add missing jobs and refresh the migration flag.")
        return 0

    for job in missing_jobs:
        timestamp = utc_now_iso()
        payload = {
            **job,
            "createdAt": timestamp,
            "updatedAt": timestamp
        }
        jobs_ref.push(payload)

    migration_ref.set(True)

    print("")
    print(f"Reconciled {len(missing_jobs)} missing jobs and refreshed jobsMigrationComplete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
