"""Pluggable object storage.

In dev (default): files are saved to `settings.upload_dir` on local disk.
In production: set `STORAGE_BACKEND=s3` and the relevant S3/R2 env vars and
files are read/written via boto3 to an S3-compatible bucket. Cloudflare R2,
AWS S3, and MinIO all speak the same API.

Public surface:
    save_bytes(key, data, content_type=None)    -> str (key)
    open_path(key) -> contextmanager yielding a local filesystem path
        (downloads from S3 to a temp file when needed; no-op for local backend)
    delete(key)
    exists(key) -> bool

`open_path` is critical: PyMuPDF and python-docx want a real file path, not a
stream. For S3 we materialize the object into a temp file and clean up after.

Env vars (all optional — falls back to local storage if STORAGE_BACKEND != s3):
    STORAGE_BACKEND=s3
    S3_BUCKET=etimad-uploads
    S3_REGION=auto                        # R2 uses "auto"
    S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com   # R2 / MinIO
    S3_ACCESS_KEY_ID=...
    S3_SECRET_ACCESS_KEY=...
    S3_KEY_PREFIX=                        # optional folder prefix
"""

from __future__ import annotations

import logging
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from .config import settings

logger = logging.getLogger(__name__)


def _backend() -> str:
    return os.getenv("STORAGE_BACKEND", "local").lower()


def is_remote() -> bool:
    return _backend() == "s3"


# ─── boto3 client (lazy) ───────────────────────────────────────

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    try:
        import boto3
    except ImportError as e:
        raise RuntimeError(
            "STORAGE_BACKEND=s3 requires the boto3 package. Add it to requirements.txt."
        ) from e

    _s3_client = boto3.client(
        "s3",
        region_name=os.getenv("S3_REGION", "auto"),
        endpoint_url=os.getenv("S3_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY"),
    )
    return _s3_client


def _bucket() -> str:
    name = os.getenv("S3_BUCKET")
    if not name:
        raise RuntimeError("S3_BUCKET env var is required when STORAGE_BACKEND=s3")
    return name


def _full_key(key: str) -> str:
    prefix = os.getenv("S3_KEY_PREFIX", "").strip("/")
    key = key.lstrip("/")
    return f"{prefix}/{key}" if prefix else key


# ─── Public API ────────────────────────────────────────────────

def _local_path(key: str) -> str:
    """Resolve a logical key (e.g. 'rfps/abc.pdf') to a local filesystem path
    rooted in settings.upload_dir."""
    safe = key.lstrip("/")
    return os.path.join(settings.upload_dir, safe)


def save_bytes(key: str, data: bytes, content_type: Optional[str] = None) -> str:
    """Persist `data` at the given logical `key`. Returns the key."""
    if is_remote():
        client = _get_s3_client()
        kwargs = {"Bucket": _bucket(), "Key": _full_key(key), "Body": data}
        if content_type:
            kwargs["ContentType"] = content_type
        client.put_object(**kwargs)
        return key

    # Local
    path = _local_path(key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return key


def exists(key: str) -> bool:
    if is_remote():
        try:
            _get_s3_client().head_object(Bucket=_bucket(), Key=_full_key(key))
            return True
        except Exception:
            return False
    return os.path.exists(_local_path(key))


def delete(key: str) -> None:
    if is_remote():
        try:
            _get_s3_client().delete_object(Bucket=_bucket(), Key=_full_key(key))
        except Exception:
            logger.exception("Failed to delete %s from S3", key)
        return
    p = _local_path(key)
    if os.path.exists(p):
        try:
            os.remove(p)
        except OSError:
            logger.exception("Failed to delete %s from local storage", p)


@contextmanager
def open_path(key: str) -> Iterator[str]:
    """Yield a local filesystem path to the object behind `key`.

    For the local backend this is the actual storage path (no copy).
    For S3, downloads to a temp file that's deleted on context exit.

    Raises FileNotFoundError if the key doesn't exist.
    """
    if is_remote():
        client = _get_s3_client()
        try:
            obj = client.get_object(Bucket=_bucket(), Key=_full_key(key))
        except client.exceptions.NoSuchKey as e:
            raise FileNotFoundError(key) from e
        except Exception as e:
            # boto3 sometimes raises ClientError with a 404 — treat as not found
            msg = str(e)
            if "404" in msg or "NoSuchKey" in msg:
                raise FileNotFoundError(key) from e
            raise

        suffix = Path(key).suffix
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        try:
            tmp.write(obj["Body"].read())
            tmp.flush()
            tmp.close()
            yield tmp.name
        finally:
            try:
                os.remove(tmp.name)
            except OSError:
                pass
        return

    path = _local_path(key)
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    yield path


# ─── Key helpers (one place to change naming conventions) ──────

def rfp_pdf_key(rfp_id: str) -> str:
    return f"rfps/{rfp_id}.pdf"


def company_doc_key(doc_id: str, ext: str) -> str:
    ext = ext if ext.startswith(".") else f".{ext}"
    return f"company_docs/{doc_id}{ext}"
