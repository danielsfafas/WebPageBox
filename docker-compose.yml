services:
  mongo:
    image: mongo:7
    container_name: webpagebox-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: webpagebox-backend
    restart: unless-stopped
    depends_on:
      - mongo
    environment:
      MONGO_URL: mongodb://mongo:27017
      DB_NAME: webpagebox
      JWT_SECRET: dev_super_secret_change_me
      STRIPE_API_KEY: sk_test_placeholder
      CORS_ORIGINS: http://localhost:3102
      ADMIN_EMAIL: admin@boxinggym.com
      ADMIN_PASSWORD: admin123
      SUBSCRIBER_ORIGIN_URL: http://localhost:3102
    ports:
      - "8102:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        REACT_APP_BACKEND_URL: http://localhost:8102
    container_name: webpagebox-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "3102:80"

volumes:
  mongo_data:
