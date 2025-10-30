# SSL certificates for local development

This folder contains **test SSL certificates** for local or staging environments.

## ⚠️ Important Security Notice

**Do NOT store or commit real production keys here!**

All `.pem` files are ignored by git for security reasons.

## Generating Test Certificates

To generate test certificates for local development, run:

```bash
./ops/nginx/ssl/generate-test-certs.sh
```

This will create:

- `privkey.pem` - Private key
- `fullchain.pem` - Self-signed certificate

## Production

For production, provide SSL certs via:

- Environment variables
- GitHub Secrets
- External secret management systems

**Never commit production keys to the repository!**
