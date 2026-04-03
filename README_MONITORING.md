# StockBud Monitoring System (Prometheus)

This system provides full observability across all StockBud microservices using Prometheus.

## Architecture

1.  **Main Backend (Port 3000)**: Exposes HTTP metrics, request counts, and durations.
2.  **Order Processor (Port 3001)**: Exposes metrics for order processing success/failure and latency.
3.  **Image Microservice (Port 3002)**: Exposes metrics for image uploads, Cloudinary integration, and processing time.
4.  **Orders Microservice (Port 3003)**: Hybrid microservice (RMQ + HTTP) exposing specific order event metrics.

## How to Run

1.  **Start Infrastructure**:
    ```bash
    docker-compose up -d
    ```
    This starts RabbitMQ and Prometheus.

2.  **Start Services**:
    Ensure each service is running (locally or via Docker).
    - Backend: `npm run start:dev`
    - Image Service: `npm run start:image`
    - Order Processor: `npm run start:order`

3.  **Access Metrics**:
    - **Prometheus UI**: [http://localhost:9090](http://localhost:9090)
    - **Backend Metrics**: [http://localhost:3000/metrics](http://localhost:3000/metrics)
    - **Image Metrics**: [http://localhost:3002/metrics](http://localhost:3002/metrics)
    - **Order Processor Metrics**: [http://localhost:3001/metrics](http://localhost:3001/metrics)
    - **Orders Microservice Metrics**: [http://localhost:3003/metrics](http://localhost:3003/metrics)

## Scrape Configuration

Prometheus is configured via `prometheus.yml` at the project root. It uses `host.docker.internal` to reach services running on the host machine from within the Docker container.

## Custom Metrics

### Image Microservice
- `image_uploads_total`: Counter (labels: `status=success/error`)
- `cloudinary_errors_total`: Counter
- `image_upload_duration_seconds`: Histogram

### Order Processor
- `orders_processed_total`: Counter (labels: `status=success/error`)
- `order_processing_duration_seconds`: Histogram

### Main Backend
- `http_requests_total`: Counter (labels: `method`, `path`, `status`)
- `http_request_duration_seconds`: Summary
- `backend_logs_total`: Counter (labels: `level`)
