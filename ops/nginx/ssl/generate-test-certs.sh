#!/bin/bash
# Generate test SSL certificates for local development

set -e

echo "Generating test SSL certificates for local development..."

# Generate private key
openssl genrsa -out privkey.pem 2048

# Generate certificate signing request
openssl req -new -key privkey.pem -out cert.csr \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=Test/CN=localhost"

# Generate self-signed certificate valid for 365 days
openssl x509 -req -days 365 -in cert.csr -signkey privkey.pem -out fullchain.pem

# Remove CSR
rm cert.csr

echo "✅ Test certificates generated successfully!"
echo "⚠️  WARNING: These are for TESTING ONLY. Do not use in production!"

