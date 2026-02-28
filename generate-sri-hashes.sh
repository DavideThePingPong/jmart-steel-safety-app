#!/bin/bash
# Generate SRI (Subresource Integrity) SHA-384 hashes for all CDN scripts
# Run this from a machine with network access, then add integrity="sha384-HASH" to index.html

URLS=(
  "https://unpkg.com/react@18.2.0/umd/react.production.min.js"
  "https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"
  "https://unpkg.com/@babel/standalone@7.24.0/babel.min.js"
  "https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js"
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js"
)

echo "SRI Hashes for JMart Safety App CDN Scripts"
echo "============================================"
echo ""

for url in "${URLS[@]}"; do
  hash=$(curl -sL "$url" | openssl dgst -sha384 -binary | openssl base64 -A)
  echo "sha384-$hash"
  echo "  → $url"
  echo ""
done

echo "Add these as integrity=\"sha384-HASH\" attributes to the corresponding <script> tags in index.html"
