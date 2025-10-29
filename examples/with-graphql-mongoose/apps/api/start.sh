#!/bin/bash
# ==============================================================================
# API Container Startup Script
# ==============================================================================
# This script is executed automatically inside the Docker container.
# DO NOT run this script manually outside of Docker.
# 
# This script:
# 1. Starts Grafana Alloy agent for observability
# 2. Starts the Node.js API application
# 3. Redirects logs to /tmp/api.log for Alloy to read and send to Loki
# ==============================================================================

set -e

# Create log file
touch /tmp/api.log

echo "================================="
echo "Starting Grafana Alloy..."
echo "================================="
/usr/local/bin/alloy run /app/apps/api/alloy.config \
  --server.http.listen-addr=0.0.0.0:12345 \
  --storage.path=/tmp/alloy &

ALLOY_PID=$!
echo "Alloy started with PID: $ALLOY_PID"
echo "Alloy will read logs from /tmp/api.log and send to Grafana Cloud Loki"

echo "================================="
echo "Starting API application..."
echo "================================="
echo "Logs are being written to /tmp/api.log"
echo "Alloy is sending logs to Grafana Cloud Loki"

cd /app/apps/api
# Start app and redirect logs to file (Alloy reads from here) and also show in stdout
npm start 2>&1 | tee -a /tmp/api.log

