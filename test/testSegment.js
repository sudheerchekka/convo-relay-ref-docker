const setTimeout = require("timers/promises").setTimeout;
const SegmentService = require("../services/segment-service");
require("dotenv").config();

const stubbedData = {
  userId: "56789654",
  traits: {
    phone: "+14083985848",
    first_name: "John",
    last_name: "Smith"
  },
};

async function main() {
  try {
    const segmentService = new SegmentService();
    //segmentService.upsertUser(stubbedData);

    // Await the async function result
    let profileTraits = await segmentService.getSegmentProfileByPhone("+14083985848");
    profileTraits = '{"customerProfile":' + JSON.stringify(profileTraits) + "}";
    // console.log(profileTraits);
    const jsonObject = JSON.parse(profileTraits);
    const userId = jsonObject.customerProfile.data.user_id;
    // console.log("userId: " + userId);


    console.log("=============");
    let profileEvents = await segmentService.getEventsByPhone("+14083985848");



    // segmentService.addEvent(
    //   'abc12345',
    //   'Appointment Scheduled' ,
    //   ({
    //     appointment_type: 'annual appointment',
    //     date: 'April 19 2025'
    //   }),
    // );

    // segmentService.addEvent(
    //   "652cbef2-1a47-47f4-b31e-3a301aee5750",
    //   "Payment reminder", 
    //   ({
    //     message_channel: 'SMS',
    //     message: 'Hi Tom!!, your payment for the last appointment is due. Don\'t forget to take care of it.',
    //   }) 
    // )

    // segmentService.addEvent({
    //   userId: "652cbef2-1a47-47f4-b31e-3a301aee5750",
    //   event: 'Payment reminder',
    //   properties: {
    //     message_channel: 'SMS',
    //     message: 'Hi Tom!!, your payment for the last appointment is due. Don\'t forget to take care of it.',
    //   },
    // });

  } catch (error) {
    console.error("Error:", error.message); // Handle errors
  }
}

// Execute the main function
main();
