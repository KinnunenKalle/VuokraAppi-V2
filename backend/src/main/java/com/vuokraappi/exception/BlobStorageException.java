package com.vuokraappi.exception;

public class BlobStorageException extends RuntimeException {

    public BlobStorageException(String message) {
        super(message);
    }

    public BlobStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}