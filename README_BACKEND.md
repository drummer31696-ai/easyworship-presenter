# EasyWorship Clone Backend (Java Spring Boot)

This backend handles the real-time synchronization between the Controller (Tablet) and the Projector (Display) using WebSockets.

## Prerequisites
- Java 17 or higher
- Maven

## How to Run
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Run the application using Maven:
   ```bash
   ./mvnw spring-boot:run
   ```
   *If on Windows:* `mvnw.cmd spring-boot:run`

## WebSocket Endpoints
- **URL**: `ws://localhost:8080/ws-presentation`
- **Topic**: `/topic/live` (Subscribe here to receive slide updates)
- **Destination**: `/app/live` (Send messages here to broadcast)

## Project Structure
- `config/WebSocketConfig.java`: Configures the message broker and STOMP endpoints.
- `controller/PresentationController.java`: Broadcasts messages received from the tablet.
- `model/PresentationMessage.java`: Defines the payload structure (Title, Content, SlideIndex, Type).
