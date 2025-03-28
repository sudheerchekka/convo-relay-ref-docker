require("dotenv").config();
const EventEmitter = require("events");
const { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand,  InvokeModelCommand} = require("@aws-sdk/client-bedrock-runtime");


class GptServiceBedrock extends EventEmitter {
  constructor(model) { 
    console.log(" new GptserviceBedrock model: " + model);
    super();
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION, 
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
    });
    this.model = model; // Initialize model here
    
    this.system_prompt = process.env.AWS_BEDROCK_SYSTEM_PROMPT;
    this.human_prompt = "";
    this.assistant_prompt = "";

    console.log(`GptServiceBedrock init with model: ${this.model}`);
  }

  // Add the callSid to the chat context in case
  // ChatGPT decides to transfer the call.
  setCallInfo(info, value) {
    console.log("setCallInfo", info, value);
    this.updateUserContext("human", `${info}: ${value}`);
  }

  interrupt() {
    this.isInterrupted = true;
  }

  validateFunctionArgs(args) {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.log(
        "Warning: Double function arguments returned by OpenAI:",
        args
      );
      // Seeing an error where sometimes we have two sets of args
      if (args.indexOf("{") != args.lastIndexOf("{")) {
        return JSON.parse(
          args.substring(args.indexOf(""), args.indexOf("}") + 1)
        );
      }
    }
  }

  updateUserContext(role, text) {
    if (role === "system"){
      this.system_prompt = this.system_prompt + "\n\n" + text;
      console.log("system_prompt", this.system_prompt);
    }
    else if (role === "human"){
      this.human_prompt = this.human_prompt + "\n\n" + text;
      console.log("human_prompt", this.human_prompt);
    }
    else if (role === "Assistant"){
      this.assistant_prompt = this.assistant_prompt + "\n\n" + text;
      console.log("assistant_prompt", this.assistant_prompt);
    }
  }

  // Summarize conversation
  async summarizeConversation() {
    console.log("summarizeConversation");

    this.human_prompt = "Summarize the conversation so far in 2-3 sentences."
    let full_prompt = this.system_prompt + "\n\nHuman: " + this.human_prompt + "\n\nAssistant: " + this.assistant_prompt;
    const full_prompt_payload = JSON.stringify({
      prompt: full_prompt,
      max_tokens_to_sample: 500,
      temperature: 0.7
    });

    const command = new InvokeModelCommand({
        modelId: this.model,
        body: full_prompt_payload,
        contentType: "application/json",
        accept: "application/json",
    });

    let stream;
    try {
        stream = await this.bedrockClient.send(command);
        console.log("Bedrock Response:", new TextDecoder().decode(stream.body));
    } catch (error) {
        console.error("Error calling Bedrock:", error);
    }

    return stream.body;
  }

    async completion(text, interactionCount, role = "human", name = "user") {
    console.log("GptServiceBedrock completion: ", role, name, text);
    this.isInterrupted = false;
    this.updateUserContext(role, text);

    console.log("this.model:", this.model, );

    let full_prompt = this.system_prompt + "\n\nHuman: " + this.human_prompt + "\n\nAssistant: " + this.assistant_prompt;
    console.log("full prompt: ", full_prompt);
    
    const full_prompt_payload = JSON.stringify({
      prompt: full_prompt,
      max_tokens_to_sample: 500,
      temperature: 0.7
    });

    const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.model,
        body: full_prompt_payload,
        contentType: "application/json",
        accept: "application/json",
    });
  
    let stream;
    try {
        stream = await this.bedrockClient.send(command);
    } catch (error) {
        console.error("Error calling Bedrock:", error);
    }

    let completeResponse = "";
    let partialResponse = "";

    console.log("processing Bedrock Response:");

    for await (const item of stream.body) {
      // Decode each chunk
      const chunk = JSON.parse(new TextDecoder().decode(item.chunk.bytes));
    
      // Get its type
      const chunk_type = chunk.type;

      console.log("chunk_type: ", chunk_type);
    
      // Process the chunk depending on its type
      if (chunk_type === "message_start") {
        // The "message_start" chunk contains the message's role
        console.log(`The message's role: ${chunk.message.role}`)
      } else if (chunk_type === "content_block_delta") {
        // The "content_block_delta" chunks contain the actual response text
    
        // Print each individual chunk in real-time
        console.log("chuck texst: ", chunk.delta.text);
    
        // ... and add it to the complete message
        completeResponse = completeResponse + chunk.delta.text;
        partialResponse = partialResponse + chunk.delta.text;
    
      } else if (chunk_type === "completion") {
        // The "content_block_delta" chunks contain the actual response text
    
        // Print each individual chunk in real-time
        console.log("chunk text: ", chunk.completion);
    
        // ... and add it to the complete message
        completeResponse = completeResponse + chunk.completion;
        partialResponse = partialResponse + chunk.completion;
    
      } else if (chunk_type === "message_stop") {
        // The "message_stop" chunk contains some metrics
        const metrics = chunk["amazon-bedrock-invocationMetrics"];
        console.log(`\nNumber of input tokens: ${metrics.inputTokenCount}`);
        console.log(`Number of output tokens: ${metrics.outputTokenCount}`);
        console.log(`Invocation latency: ${metrics.invocationLatency}`);
        console.log(`First byte latency: ${metrics.firstByteLatency}`);
      }

      if (chunk_type === "message_stop") {
        // console.log("emit gptreply stop");
        this.emit("gptreply", partialResponse, true, interactionCount);
      } else {
        // console.log('emit gptreply partialResponse', partialResponse);
        this.emit("gptreply", partialResponse, false, interactionCount);
        partialResponse = "";
      }
    }

    console.log("completeResponse: ", completeResponse);
    console.log("processing done..");

    //this.userContext.push({ role: "assistant", content: completeResponse });
    this.updateUserContext("System", completeResponse);
    //console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = GptServiceBedrock;
