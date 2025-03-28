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

## Step 1: Configuration
### **.env File Setup**
Create a `.env` file by making a copy of `.env.example`

## Step 2: Start ngrok to create a public url for your server
```sh
ngrok http --subdomain=<your_domain_name> 8080
```

## Step 3: Configure your Twilio phone number with the twiml redirect to your webserver
```sh
Create a Twiml Bin using this
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Redirect method="POST">https://<your_domain_name>.ngrok.io/incoming</Redirect>
</Response>

Configure this Twiml Bin to your Twilio number
```



## Step 4 (Option 1): Start the docker container from the pre-built image
### **a. Pull the Docker image from Docker Hub**
```sh
docker pull sudheertwilio/twilio-convo-relay-server
```

### **b. Create and start a new Docker container from image**
```sh
docker run --env-file .env -p 8080:8080 sudheertwilio/twilio-convo-relay-server
```

## Step 4 (Option 2): Running the server Locally
### **a. Install Dependencies**
```sh
npm install
```

### **b. Start the Web & WebSocket Servers**
```sh
node server.js
```
### **c. Exposing Locally Hosted Server with Ngrok (Optional)**
```sh
ngrok http 8080
```
This will generate a public URL for your local server.

## Step 4 (Option 3): Build Docker image and run the server in the container
### **a. Build the Docker Image**
```sh
docker build -t twilio-convo-relay-server .
```
### **b. Deploy your Docker Image**
Choose your favorite cloud provider to deploy the Dcoker container or just run locally. To run locally:

```sh
docker run --env-file .env -p 8080:8080 twilio-convo-relay-server

ngrok http 8080
```



## API Endpoints
| Method | Endpoint        | Description |
|--------|---------------|-------------|
| POST   | `/incoming`    | Configure this endpoint as webhook for your Twilio phone number |


## Contact
For any questions, reach out to Sudheer Chekka

