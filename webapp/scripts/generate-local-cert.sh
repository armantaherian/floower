#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="$APP_DIR/certs"
CONF_FILE="$CERT_DIR/localhost.cnf"
CERT_FILE="$CERT_DIR/localhost-cert.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"

mkdir -p "$CERT_DIR"

cat >"$CONF_FILE" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = US
ST = Local
L = Localhost
O = Floower
OU = Dev
CN = localhost

[v3_req]
subjectAltName = @alt_names
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days 825 \
  -config "$CONF_FILE"

echo "Generated:"
echo "- $CERT_FILE"
echo "- $KEY_FILE"
