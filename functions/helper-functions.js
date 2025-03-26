// helper-functions.js
// CFA: Added

//  CFA: Added to support agent handoff
//
//  This is a simple keyword matching of the customer utterance;
//  Optimization of this code can be achieved in a number of ways.
//
// Function to process user input for handoff
async function processUserInputForHandoff(userInput) {
  console.log( 'in process Agent handoff')
    const handoffKeywords = [
      "live agent",
      "real person",
      "talk to a representative",
      "transfer me to a human",
      "speak to a person",
      "speak to an agent",
      "speak with an agent",
      "talk to an agent",
      "talk to someone",
      "customer service",
      "speak to a vet",
      "can I speak to a doctor",
    ];
  
    // Check if the input contains any of the keywords
    if (
      handoffKeywords.some((keyword) =>
        userInput.toLowerCase().includes(keyword.toLowerCase())
      )
    ) {
      console.log(
        `[AppHelperFunctions] Live agent handoff requested by user input.`
      );
      return true; // Signals that we should perform a handoff
    }
    return false; // No handoff needed
  }

//  CFA: Added to support agent handoff
//
// Function to handle live agent handoff
async function handleLiveAgentHandoff(
  gptService,
  endSessionService,
  textService,
  userProfile,
  userInput
) {
  console.log("UserProfile:", userProfile);
  const name = userProfile?.customerProfile?.data?.first_name
    ? userProfile.customerProfile.data.first_name
    : ""; // Get user's name if available

  console.log("name: " + name);

  const nameIntroOptions = name
    ? [
        `Sure ${name},`,
        `Okay ${name},`,
        `Alright ${name},`,
        `Got it ${name},`,
        `Certainly ${name},`,
      ]
    : ["Sure,", "Okay,", "Alright,", "Got it,", "Certainly,"];

  const randomIntro =
    nameIntroOptions[Math.floor(Math.random() * nameIntroOptions.length)];

  const handoffMessages = [
    `${randomIntro} one moment, I'll transfer you to a live agent now.`,
    `${randomIntro} let me get a live agent to assist you. One moment please.`,
    `${randomIntro} I'll connect you with a live person right away. Just a moment.`,
    `${randomIntro} sure thing, I'll transfer you to customer service. Please hold for a moment.`,
  ];

  const randomHandoffMessage =
    handoffMessages[Math.floor(Math.random() * handoffMessages.length)];

  console.log(`[AppHelperFunctions] Hand off message: ${randomHandoffMessage}`);

  // Send the random handoff message to the user
  // textService.sendText(randomHandoffMessage, true); // Final message before handoff

  // Add the final user input to userContext for summarization
  // CFA: TODO - investigate duplicate prompt to caller on request for agent handoff

  gptService.updateUserContext("user", "user", userInput);

  // Add the randomHandoffMessage to the userContext
  // CFA: TODO - investigate duplicate prompt to caller on request for agent handoff
  // gptService.updateUserContext("assistant", "assistant", randomHandoffMessage);

  // Proceed with summarizing the conversation, including the latest messages
  const conversationSummary = await gptService.summarizeConversation();

  // End the session and include the conversation summary in the handoff data
  // Introduce a delay before ending the session
  setTimeout(() => {
    // End the session and include the conversation summary in the handoff data

    endSessionService.endSession({
      reasonCode: "live-agent-handoff",
      reason: "User requested to speak to a live agent.",
      conversationSummary: conversationSummary,
      customerData: JSON.parse(userProfile),
    });
  }, 1000); // 1 second delay
}

module.exports = {
  // generateMockDatabase,
  // getTtsMessageForTool,
  processUserInputForHandoff,
  handleLiveAgentHandoff,
  // handleDtmfInput,
};
