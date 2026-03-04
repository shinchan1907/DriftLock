#!/bin/bash
# Run this to build the agent binary
# Output goes to agent-builder/dist/
mkdir -p dist
docker build -t driftlock-agent-builder -f agent-builder/Dockerfile .
docker run --rm -v "$(pwd)/agent-builder/dist:/output" driftlock-agent-builder
echo "Built: agent-builder/dist/driftlock-agent"
