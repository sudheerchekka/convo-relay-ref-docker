//require("colors");
require("dotenv").config();
const EventEmitter = require("events");
const OpenAI = require("openai");
//const tools = require("../functions/function-manifest");

//const { prompt, userProfile, orderHistory } = require("./prompt");

// const model = "gpt-4o-mini"

// Import all functions included in function manifest
// Note: the function name and file name must be the same
const availableFunctions = {};

//TODO: how to externalize the tools
// tools.forEach((tool) => {
//   let functionName = tool.function.name;
//   availableFunctions[functionName] = require(`../functions/${functionName}`);
//   console.log(`load function: ${functionName}`);
// });

class GptServiceOpenAI extends EventEmitter {
  constructor(model) { // = "gpt-4o"
    super();
    this.openai = new OpenAI();
    this.model = model; // Initialize model here
    

    (this.userContext = [
      {
        role: "developer",
        content: `${process.env.DEVELOPER_PROMPT}`
      },
      {
        role: "assistant",
        content: `${process.env.ASSISTANT_PROMPT}`
      },
    ]),
      (this.partialResponseIndex = 0);
    this.isInterrupted = false;
  }

  // Add the callSid to the chat context in case
  // ChatGPT decides to transfer the call.
  setCallInfo(info, value) {
    this.userContext.push({ role: "user", content: `${info}: ${value}` });
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

  // updateUserContext(name, role, text) {
  //   console.log("updateUserContext: ", name, role, text);
  //   if (name !== "user") {
  //     console.log("Not a user");
  //     this.userContext.push({ role: role, name: name, content: text });
  //   } else {
  //     console.log("User");
  //     this.userContext.push({ role: role, content: text });
  //   }
  // }

  updateUserContext(role, text) {
    console.log("updateUserContext: ", role, text);
    this.userContext.push({ role: role, content: text });
  }

  // Summarize conversation
  async summarizeConversation() {
    console.log("summarizeConversation");
    const summaryPrompt = "Summarize the conversation so far in 2-3 sentences.";
    const summaryResponse = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        ...this.userContext,
        { role: "system", content: summaryPrompt },
      ],
    });
    return summaryResponse.choices[0]?.message?.content || "";
  }

  async completion(text, interactionCount, role = "user", name = "user") {
    console.log("GptService completion: ", role, name, text);
    console.log("this.userContext: ", this.userContext);
    this.isInterrupted = false;
    this.updateUserContext(role, text);
    // Step 1: Send user transcription to Chat GPT
    let stream = await this.openai.chat.completions.create({
      model: this.model,
      messages: this.userContext,
      //tools: tools,
      stream: true,
      temperature: 0.5,
    });

    let completeResponse = "";
    let partialResponse = "";
    let functionName = "";
    let functionArgs = "";
    let finishReason = "";

    function collectToolInformation(deltas) {
      let name = deltas.tool_calls[0]?.function?.name || "";
      console.log("Found function name:", name);
      if (name != "") {
        functionName = name;
      }
      let args = deltas.tool_calls[0]?.function?.arguments || "";
      if (args != "") {
        // args are streamed as JSON string so we need to concatenate all chunks
        functionArgs += args;
      }
      //console.log('collectToolInformation', functionName, functionArgs);
    }

    for await (const chunk of stream) {
      if (this.isInterrupted) {
        console.log("Interrupted");
        break;
      }

      let content = chunk.choices[0]?.delta?.content || "";
      let deltas = chunk.choices[0].delta;
      finishReason = chunk.choices[0].finish_reason;

      // console.log("Content: ", content);
      // console.log("Deltas: ", deltas);
      // console.log("Finish Reason: ", finishReason);

      // Step 2: check if GPT wanted to call a function
      if (deltas.tool_calls) {
        // Step 3: Collect the tokens containing function data
        collectToolInformation(deltas);
      }

      // need to call function on behalf of Chat GPT with the arguments it parsed from the conversation
      if (finishReason === "tool_calls") {
        console.log("finishReason tool_calls: ", functionName, functionArgs);
        // parse JSON string of args into JSON object

        const functionToCall = availableFunctions[functionName];
        const validatedArgs = this.validateFunctionArgs(functionArgs);
        // console.log('validatedArgs', validatedArgs);

        // Say a pre-configured message from the function manifest
        // before running the function.
        const toolData = tools.find(
          (tool) => tool.function.name === functionName
        );
        console.log("toolData: ", toolData);
        const say = toolData.function.say;

        this.emit("gptreply", say, false, interactionCount);

        let functionResponse = await functionToCall(validatedArgs);

        // console.log('functionResponse', functionResponse)
        this.emit("tools", functionName, functionArgs, functionResponse);

        // Step 4: send the info on the function call and function response to GPT
        this.updateUserContext(functionName, "function", functionResponse);

        // call the completion function again but pass in the function response to have OpenAI generate a new assistant response
        await this.completion(
          functionResponse,
          interactionCount,
          "function",
          functionName
        );
      } else {
        //console.log("finishReason not tool_calls: ", finishReason);
        // We use completeResponse for userContext
        completeResponse += content;
        // We use partialResponse to provide a chunk for TTS
        partialResponse += content;

        // console.log('partialResponse', partialResponse);
        // console.log('completeResponse', completeResponse);

        if (finishReason === "stop") {
          // console.log("emit gptreply stop");
          this.emit("gptreply", partialResponse, true, interactionCount);
        } else {
          // console.log('emit gptreply partialResponse', partialResponse);
          this.emit("gptreply", partialResponse, false, interactionCount);
          partialResponse = "";
        }
      }
    }
    this.userContext.push({ role: "assistant", content: completeResponse });
    console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = GptServiceOpenAI;
