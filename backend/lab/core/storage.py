"""Storage interface and implementations for the Lab backend."""
import io
import os
import gzip
import asyncio
from abc import ABC, abstractmethod
import time
from typing import AsyncIterator, BinaryIO, Optional, Protocol

import boto3
from botocore.client import Config

from lab.core import logger
from lab.core.config import S3Config

logger = logger.get_logger()

class Storage(Protocol):
    """Storage interface."""
    
    async def store(self, key: str, data: BinaryIO, cache_control: Optional[str] = None) -> None:
        """Store data at the given key."""
        ...

    async def store_atomic(self, key: str, data: BinaryIO, content_type: Optional[str] = None, cache_control: Optional[str] = None) -> None:
        """Store data at the given key atomically."""
        ...

    async def get(self, key: str) -> AsyncIterator[bytes]:
        """Get data from the given key."""
        ...

    async def delete(self, key: str) -> None:
        """Delete data at the given key."""
        ...

    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        ...

class S3Storage:
    """S3 storage implementation."""

    DEFAULT_STORE_CACHE = "max-age=10800"  # 3 hours
    DEFAULT_ATOMIC_CACHE = "max-age=3600"  # 1 hour

    def __init__(self, config: S3Config):
        """Initialize S3 storage."""
        self.config = config
        logger.info("Initializing S3 storage", 
                   endpoint=config.endpoint, 
                   bucket=config.bucket,
                   region=config.region)
        
        self.client = boto3.client(
            's3',
            endpoint_url=config.endpoint,
            aws_access_key_id=config.access_key_id,
            aws_secret_access_key=config.secret_access_key,
            region_name=config.region,
            config=Config(s3={'addressing_style': 'path'})
        )
        self.bucket = config.bucket
        logger.info("S3 storage initialized")

    async def store(self, key: str, data: BinaryIO, cache_control: Optional[str] = None) -> None:
        """Store data at the given key."""
        logger.debug("Storing object", key=key)
        try:
            await self._upload(key, data, cache_control=cache_control or self.DEFAULT_STORE_CACHE)
            logger.debug("Successfully stored object", key=key)
        except Exception as e:
            logger.error("Failed to store object", key=key, error=str(e))
            raise

    async def store_atomic(self, key: str, data: BinaryIO, content_type: Optional[str] = None, cache_control: Optional[str] = None) -> None:
        """Store data at the given key atomically."""
        temp_key = f"temp/{key}"
        logger.debug("Starting atomic store", key=key, temp_key=temp_key)
        try:
            # Upload to temp location
            logger.debug("Uploading to temp location", temp_key=temp_key)
            await self._upload(temp_key, data, content_type, cache_control=cache_control or self.DEFAULT_ATOMIC_CACHE)

            # Sleep for 1 second to ensure temp file is visible
            await asyncio.sleep(1)

            # Copy to final location
            logger.debug("Copying to final location", src=temp_key, dst=key)
            await self._copy(temp_key, key)

            # Delete temp file
            logger.debug("Cleaning up temp file", temp_key=temp_key)
            await self.delete(temp_key)
            
            logger.debug("Successfully completed atomic store", key=key)
        except Exception as e:
            logger.error("Failed to store object atomically", key=key, error=str(e))
            # Try to clean up temp file
            try:
                logger.debug("Attempting to clean up temp file after failure", temp_key=temp_key)
                await self.delete(temp_key)
            except Exception as cleanup_e:
                logger.warning("Failed to clean up temp file", temp_key=temp_key, error=str(cleanup_e))
            raise

    async def get(self, key: str) -> AsyncIterator[bytes]:
        """Get data from the given key."""
        logger.debug("Getting object", key=key)
        try:
            response = await asyncio.to_thread(
                self.client.get_object,
                Bucket=self.bucket,
                Key=key
            )
            logger.debug("Successfully got object", key=key, size=response.get('ContentLength', 0))
            
            # Handle gzipped content
            if response.get('ContentEncoding') == 'gzip':
                body = await asyncio.to_thread(response['Body'].read)
                if not body:
                    logger.warning("Empty response body", key=key)
                    yield b""
                    return
                
                decompressed = await asyncio.to_thread(gzip.decompress, body)
                yield decompressed
            else:
                async for chunk in self._stream_response(response['Body']):
                    yield chunk
        except Exception as e:
            logger.error("Failed to get object", key=key, error=str(e))
            raise

    async def delete(self, key: str) -> None:
        """Delete data at the given key."""
        logger.debug("Deleting object", key=key)
        try:
            await asyncio.to_thread(
                self.client.delete_object,
                Bucket=self.bucket,
                Key=key
            )
            logger.debug("Successfully deleted object", key=key)
        except Exception as e:
            logger.error("Failed to delete object", key=key, error=str(e))
            raise

    async def exists(self, key: str) -> bool:
        """Check if a key exists using head_object."""
        logger.debug("Checking if object exists", key=key)
        try:
            await asyncio.to_thread(
                self.client.head_object,
                Bucket=self.bucket,
                Key=key
            )
            logger.debug("Object exists", key=key)
            return True
        except Exception as e:
            logger.debug("Object does not exist", key=key, error=str(e))
            return False

    async def _upload(self, key: str, data: BinaryIO, content_type: Optional[str] = None, cache_control: Optional[str] = None) -> None:
        """Upload data to S3."""
        logger.debug("Uploading data", key=key)
        
        # Read and compress data
        raw_data = data.read()
        compressed_data = gzip.compress(raw_data)
        
        # Determine content type based on file extension or passed parameter
        if content_type is None:
            content_type = 'application/json' if key.endswith('.json') else 'application/octet-stream'
        
        # Upload with content type and compression
        extra_args = {
            'ContentType': content_type,
            'ContentEncoding': 'gzip',
        }
        
        if cache_control:
            extra_args['CacheControl'] = cache_control
        
        await asyncio.to_thread(
            self.client.upload_fileobj,
            io.BytesIO(compressed_data),
            self.bucket,
            key,
            ExtraArgs=extra_args
        )
        logger.debug("Successfully uploaded data", key=key)

    async def _copy(self, src_key: str, dst_key: str) -> None:
        """Copy object within S3."""
        logger.debug("Copying object", src=src_key, dst=dst_key)
        copy_source = {'Bucket': self.bucket, 'Key': src_key}
        
        max_retries = 5
        base_delay = 1  # Start with 1 second
        
        for attempt in range(max_retries):
            try:
                # Get metadata from source object
                src_obj = await asyncio.to_thread(
                    self.client.head_object,
                    Bucket=self.bucket,
                    Key=src_key
                )
                
                # Determine content type if not in source
                content_type = src_obj.get('ContentType')
                if content_type is None:
                    content_type = 'application/json' if dst_key.endswith('.json') else 'application/octet-stream'
                
                # Copy with metadata
                await asyncio.to_thread(
                    self.client.copy_object,
                    CopySource=copy_source,
                    Bucket=self.bucket,
                    Key=dst_key,
                    ContentType=content_type,
                    ContentEncoding='gzip',  # We know we always gzip in _upload
                    CacheControl=src_obj.get('CacheControl', ''),
                    MetadataDirective='REPLACE'  # We're explicitly setting the headers
                )
                logger.debug("Successfully copied object", src=src_key, dst=dst_key)
                return
            except Exception as e:
                delay = base_delay * (2 ** attempt)  # Exponential backoff
                if attempt < max_retries - 1:
                    logger.warning(
                        "Copy failed, retrying",
                        src=src_key,
                        dst=dst_key,
                        attempt=attempt + 1,
                        max_retries=max_retries,
                        delay=delay,
                        error=str(e)
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "Copy failed after all retries",
                        src=src_key,
                        dst=dst_key,
                        attempts=max_retries,
                        error=str(e)
                    )
                    raise

    async def _stream_response(self, body: BinaryIO, chunk_size: int = 8192) -> AsyncIterator[bytes]:
        """Stream S3 response body."""
        total_bytes = 0
        while True:
            chunk = await asyncio.to_thread(body.read, chunk_size)
            if not chunk:
                logger.debug("Finished streaming response", total_bytes=total_bytes)
                break
            total_bytes += len(chunk)
            yield chunk 