#!/bin/bash

# Generate RSA key pair for JWT signing (RS256)
# Run this script from the backend-ts directory

KEYS_DIR="./keys"

mkdir -p "$KEYS_DIR"

# Generate private key (2048 bits)
openssl genrsa -out "$KEYS_DIR/private.pem" 2048

# Extract public key from private key
openssl rsa -in "$KEYS_DIR/private.pem" -pubout -out "$KEYS_DIR/public.pem"

echo "Keys generated successfully in $KEYS_DIR/"
echo "  - private.pem (keep this secret!)"
echo "  - public.pem (can be shared for token verification)"
