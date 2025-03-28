require("dotenv").config();
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

console.log("Creating bedrock clinet");
const client = new BedrockRuntimeClient({
  region: "us-east-1", // Set your AWS region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
});

  //prompt: "\n\nHuman: I am designing a chatbot for a healthcare application. The chatbot should be able to answer common medical questions, schedule appointments, and provide reminders for medications. How should I design the conversation flow to make it intuitive and user-friendly?\n\nAssistant:",
const payload = JSON.stringify({
  prompt: `${process.env.AWS_BEDROCK_PROMPT}`,
  max_tokens_to_sample: 500,
  temperature: 0.7
});

//"anthropic.claude-v2:1"
//"anthropic.claude-3-haiku-20240307-v1:0' -- not supported
async function callBedrock() {

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2:1", // Change this to the model you want
      body: payload,
      contentType: "application/json",
    });

    try {
        const response = await client.send(command);
        console.log("Response:", new TextDecoder().decode(response.body));
    } catch (error) {
        console.error("Error calling Bedrock:", error);
    }
}

callBedrock();
