# Deployment Guide

## Docker Compose (Production)

To deploy the full stack including PostgreSQL and Ollama with GPU support:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Ensure you have the NVIDIA Container Toolkit installed if you plan to use GPU acceleration for Ollama.

## Kubernetes (K8s)

1. **Build Images**:
   ```bash
   docker build -t buddy-backend:latest -f backend/Dockerfile.prod backend/
   docker build -t buddy-frontend:latest -f frontend/Dockerfile.prod frontend/
   ```

2. **Load Images (if using local cluster like Kind/Minikube)**:
   ```bash
   kind load docker-image buddy-backend:latest
   kind load docker-image buddy-frontend:latest
   ```

3. **Apply Manifests**:
   ```bash
   kubectl apply -f k8s/
   ```

4. **Access**:
   The ingress is configured to listen on the cluster's ingress controller IP.
   Mapp `localhost` or your domain to that IP.

## Environment Variables

See `.env.example` for a list of configurable environment variables.
