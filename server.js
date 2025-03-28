require("dotenv").config();
const express = require('express');
const ExpressWs = require("express-ws");
const twilio = require('twilio');

// const { GptService } = require("./services/gpt-service");
// const { GptServiceBedrock } = require("./services/gpt-service-bedrock");

const services = {
  AWS: require("./services/GptServiceBedrock"),
  OPENAI: require("./services/GptServiceOpenAI"),
  DEFAULT: require("./services/GptServiceOpenAI")
};


const { TextService } = require("./services/text-service");
const { EndSessionService } = require("./services/end-session-service");
const SegmentService  = require("./services/segment-service");

// Import helper functions
const {
  processUserInputForHandoff,
  handleLiveAgentHandoff,
} = require("./functions/helper-functions");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// TODO: not working
// Serve static files (optional, e.g., an HTML page)
app.use(express.static('public'));
ExpressWs(app);

let gptService;
let unifiedProfile = null;

console.log("Started Web and WebSocket server");

app.post("/agenthandoff", async (req, res) => {

  console.log ("Agent handoff: WORKSPACE_SID: ", process.env.WORKSPACE_SID);

  const taskAttributes = {
    accountSid: req.body.AccountSid,
    callSid: req.body.callSid,
    from: req.body.From
    // You can add more fields if needed from parsedHandoffData
  };

  const twiml = new twilio.twiml.VoiceResponse();

  //hand off to Twilio Flex only if WORKSPACE_SID is available 
if (process.env.WORKSPACE_SID !== 'undefined'){
  twiml.enqueue({
    workflowSid: `${process.env.WORKSPACE_SID}`,  
  }).task({ priority: '1000' }, JSON.stringify(taskAttributes));
}

  res.type("text/xml");
  res.end(twiml.toString());

});

app.post("/incoming", async (req, res) => {
  let unifiedProfileEvents = null;
  
  try {
    logs.length = 0; // Clear logs
    addLog("info", "incoming call started");

    // Initialize the appropriate GPT service
    const selectedGPTService = process.env.LLM_VENDOR;
    addLog("info", "Selected GPT service: " + selectedGPTService);
    const modelEnvVar = `${selectedGPTService}_LLM_MODEL`;
    console.log ("Selected LLM MODEL: ", `${process.env[modelEnvVar]}`);
    gptService = new services[selectedGPTService](`${process.env[modelEnvVar]}`);

    let segmentService = null;
    if (process.env.SEGMENT_UNIFY_WRITE_KEY != "" && process.env.SEGMENT_UNIFY_SPACE_ID != "" || process.env.SEGMENT_UNIFY_ACCESS_TOKEN != ""){
      segmentService = new SegmentService();
    }
    else 
    {
      console.log("Segment is not configured");
    }
    if (segmentService){
      // get Unified Profile data from Segment
      let up = await segmentService.getSegmentProfileByPhone(req.body.From);
      if (up != null){
        unifiedProfile = JSON.stringify(up.data);
        console.log("Profile Found: ", unifiedProfile);

        let e = await segmentService.getEventsByPhone(req.body.From);
        if(e.data != null) {
          unifiedProfileEvents = JSON.stringify(e.data);
        } else { unifiedProfileEvents = null}

        gptService.updateUserContext("system", JSON.stringify(unifiedProfile));
        if(unifiedProfileEvents!=null){
          gptService.updateUserContext("system", unifiedProfileEvents);
        }
      }
      else 
        console.log("No profile Found: ");
  }
  else{console.log("Segment is not configured")};


    //TODO: ${record.language}
    let content = "You can speak in many languages, but use default language of english for this conversation from now on! Remember it as the default language, even you change language in between. treat en-US and en-GB etc. as different languages.";
    gptService.updateUserContext("system", content);

    //TODO: add env params for voice, language, transcriptionprovider
    const response = `<Response>
      <Connect action="https://${process.env.SERVER}/${process.env.CONNECT_ACTION_URI}">
        <ConversationRelay url="wss://${process.env.SERVER}/sockets" dtmfDetection="true">
          <Language code="fr-FR" ttsProvider="google" voice="fr-FR-Neural2-B" />
          <Language code="es-ES" ttsProvider="google" voice="es-ES-Neural2-B" />
        </ConversationRelay>
      </Connect>
      </Response>`;

    res.type("text/xml");
    res.end(response.toString());
  } catch (err) {
    console.log("Error: ", err);
  }
});

app.ws("/sockets", (ws) => {

  try {
    ws.on("error", console.error);
    // Filled in from start message
    let callSid;
    let from;
    let to;

    textService = new TextService(ws);
    endSessionService = new EndSessionService(ws);

    let interactionCount = 0;

    // Incoming from MediaStream
    ws.on("message", async function message(data) {
      const msg = JSON.parse(data);
      if (msg.type === "setup") {
        callcallSid = msg.callSid;
        from = msg.from;
        gptService.setCallInfo("user phone number", msg.from);

        //trigger gpt to start
        gptService.completion("hello", interactionCount);
        interactionCount += 1;

        // if (record.recording) {
        //   recordingService(textService, callSid).then(() => {
        //     console.log(
        //       `Twilio -> Starting recording for ${callSid}`.underline.red
        //     );
        //   });
        // }
      }

      if (msg.type === "prompt") {
        addLog(
          "convrelay",
          `convrelay -> GPT (${msg.lang}) :  ${msg.voicePrompt} `
        );
        gptService.completion(msg.voicePrompt, interactionCount);
        interactionCount += 1;

        const trimmedVoicePrompt = msg.voicePrompt.trim();
        const shouldHandoff = await processUserInputForHandoff(
          trimmedVoicePrompt
        );

        addLog(
          "convrelay",
          `convrelay -> should handoff: (${trimmedVoicePrompt} : ${shouldHandoff})`
        );

        // live agent handoff
        if (shouldHandoff) {
          addLog("convrelay", "convrelay handing off to live agent");
          handleLiveAgentHandoff(
            gptService,
            endSessionService,
            textService,
            JSON.stringify(unifiedProfile),
            trimmedVoicePrompt
          );
        }
      }

      if (msg.type === "interrupt") {
        addLog(
          "convrelay",
          "convrelay interrupt: utteranceUntilInterrupt: " +
            msg.utteranceUntilInterrupt +
            " durationUntilInterruptMs: " +
            msg.durationUntilInterruptMs
        );
        gptService.interrupt();
        // console.log('Todo: add interruption handling');
      }

      if (msg.type === "error") {
        addLog("convrelay", "convrelay error: " + msg.description);
      }

      if (msg.type === "dtmf") {
        addLog("convrelay", "convrelay dtmf: " + msg.digit);

        console.log("Todo: add dtmf handling");
      }

    });
      
    gptService.on('gptreply', async (gptReply, final, icount) => {
      //console.log(`Interaction ${icount}: GPT -> TTS: ${gptReply}`.green );
      //addLog('info', gptReply);
      textService.sendText(gptReply, final);
    });

    gptService.on(
      "tools",
      async (functionName, functionArgs, functionResponse) => {
        addLog("gpt", `Function ${functionName} with args ${functionArgs}`);
        addLog("gpt", `Function Response: ${functionResponse}`);

        if (functionName == "changeLanguage" && record.changeSTT) {
          addLog("convrelay", `convrelay ChangeLanguage to: ${functionArgs}`);
          let jsonObj = JSON.parse(functionArgs);
          textService.setLang(jsonObj.language);
          // gptService.userContext.push({ 'role': 'assistant', 'content':`change Language to ${functionArgs}`});
        }
      }
    );
  } catch (err) {
    console.log(err);
  }

});

// HTTP Endpoint Example
app.get('/', (req, res) => {
    res.send('Hello from the web server!');
});

// Initialize an array to store logs
const logs = [];

function addLog(level, message) {
  console.log("addLog:", message);
  const timestamp = new Date().toISOString();
  logs.push({ timestamp, level, message });
}

// Start server
const PORT = process.env.PORT;
app.listen(PORT);
