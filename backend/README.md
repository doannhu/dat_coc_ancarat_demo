# Backend Setup

1. **Prerequisites**: Docker and Docker Compose.
2. **Start Services**:
   Run the following command from the project root:
   ```bash
   docker-compose up -d --build
   ```
3. **Access API**: 
   The API will be available at [http://localhost:8000](http://localhost:8000/docs).
4. **Database**:
   PostgreSQL is running on port 5433 (host) -> 5432 (container).
   Connection string: `postgresql://user:password@localhost:5433/dbname`

## Architecture

The backend follows a **Module-Based** architecture with a clear separation of concerns:

- **Router (Controller)**: Handles incoming HTTP requests, validates input using Pydantic schemas, and returns responses. Located in `app/modules/<module>/router.py`.
- **Service**: Contains the core business logic. It orchestrates operations and calls the repository. Located in `app/modules/<module>/service.py`.
- **Repository**: Handles direct database interactions using SQLAlchemy. It performs CRUD operations. Located in `app/modules/<module>/repository.py`.

```mermaid
graph TD
    Client[Client / Frontend] -->|HTTP Request| Router[Router / Controller]
    Router -->|Pydantic Model| Service[Service Layer]
    Service -->|Business Logic| Repository[Repository Layer]
    Repository -->|SQLAlchemy| DB[(PostgreSQL Database)]
    DB --> Repository
    Repository --> Service
    Service --> Router
    Router -->|HTTP Response| Client
```
