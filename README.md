# Dockerized AI Reference Application for Twilio Conversation Relay

## Overview
This repository provides a Dockerized solution for hosting a web server and WebSocket server to power an AI-driven voice application using Twilio Conversation Relay. It demonstrates a 'Bring Your Own LLM' approach, leveraging Twilio Segment for personalized voice interactions based on a unified user profile. Additionally, it enables seamless live agent handoff to Twilio Flex. The solution supports both Docker-based and local deployments.


## Features
- **Web Server**: Serves webhook endpoint for Twilio Voice TwiML application.
- **WebSocket Server**: Handles real-time bidirectional communication between real-time voice and backend application.
- **Unified Profile**: Twilio Segment to host unified profile traits and relevant events.
- **Bring Your Own LLM**: Configure your preferred LLM to build AI voice application.
- **Live Agent Handoff**: Transfers AI virtual agent conversation to a human agent when necessary.

## Prerequisites
- **Node.js**
- **Docker**
- **Ngrok** (Optional, for exposing locally hosted services)
- **Twilio Account** (Optional, Twilio Flex account for live agent handoff)
- **Segment Account** (Optional, to personalize the voice interaction )

## Configuration
### **.env File Setup**
Create a `.env` file by making a copy of `.env.example`

## Running Locally
### **1. Install Dependencies**
```sh
npm install
```

### **2. Start the Web & WebSocket Servers**
```sh
node server.js
```
### **3. Exposing Locally Hosted Server with Ngrok (Optional)**
```sh
ngrok http 8080
```
This will generate a public URL for your local server.

## Running with Docker
### **1. Build the Docker Image**
```sh
docker build -t my-websocket-server .
```
### **2. [Option 1] Deploy your Docker Image**
Choose your favorite cloud provider to host the docker image and deploy it

### **2. [Option 2] Run the Container locally**
```sh
docker run --env-file .env -p 8080:8080 my-websocket-server

ngrok http 8080
```



## API Endpoints
| Method | Endpoint        | Description |
|--------|---------------|-------------|
| POST   | `/incoming`    | Configure this endpoint as webhook for your Twilio phone number |


## Contact
For any questions, reach out to Sudheer Chekka

