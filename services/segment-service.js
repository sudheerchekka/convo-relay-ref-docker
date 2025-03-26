const { Analytics } = require("@segment/analytics-node");
require("dotenv").config();
const axios = require("axios");
const profileToken = process.env.SEGMENT_UNIFY_ACCESS_TOKEN;

const analytics = new Analytics({
  writeKey: process.env.SEGMENT_UNIFY_WRITE_KEY,
});
const spaceId = process.env.SEGMENT_UNIFY_SPACE_ID;
const exclude_events = process.env.SEGMENT_EXCLUDE_EVENTS;

class SegmentService{

  upsertUser({ userId, traits }) {
    try {
      if (!userId) {
        throw new Error("Either `userId` or `anonymousId` must be provided.");
      }

      analytics.identify({ userId, traits });
    } catch (error) {
      console.error("Error adding user:", error);
    }
    console.log("add user done");
  }

  //eventProperties is json string like
        // {
        //   appointment_type: 'annual appointment',
        //   date: 'Feb 15 2025',
        //   pet: 'Max',
        // }
  addEvent = (id, eventName, eventProperties) => {
    console.log( 'SegmentSvc:addEvent ', id)
    try {
      analytics.track({
        userId: id,
        event: eventName,
        properties: eventProperties
      });
    } catch (error) {
      console.error("Error adding addEvent:", error);
    }
    console.log("addEvent done: ", eventName);
  }

  //  Lookup Segment Unified profile by user_id
  getProfileByUserId = async (id) => {
    const password = "";
    // encode base64
    const credentials = Buffer.from(`${profileToken}:${password}`).toString(
      "base64"
    );
    // set headers
    const config = {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    };
    console.log("get_profile from segment for id: " + id);
    // HTTP GET
    await axios
      .get(
        `https://profiles.segment.com/v1/spaces/${spaceId}/collections/users/profiles/user_id:${id}/traits`,
        config
      )
      .then((response) => {
        const traits = response.data.traits;
        console.log(traits);
        return traits;
      })
      .catch((error) => {
        console.error("get_profile error:", error);
        return "";
      });
  };

  getSegmentProfileByPhone = async (phone) => {
    // handle encoding of e.164
    if (phone.trim().includes("+")) {
      phone = phone.replace("+", "%2B");
    } else {
      phone = "%2B" + phone.replace(" ", "");
    }
    // return JSON object
    let result = {};

    const url = `https://profiles.segment.com/v1/spaces/${spaceId}/collections/users/profiles/phone:${phone}/traits?limit=100`;
    const password = "";
    const credentials = Buffer.from(`${profileToken}:${password}`).toString(
      "base64"
    );
    // set headers
    const config = {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    };
    // console.log('get_profile from segment for phone: ' + phone);
    // HTTP GET
    return await axios
      .get(url, config)
      .then((response) => {
        result = { status: "found", data: response.data.traits };
        console.log("traits in segment service: " + JSON.stringify(response.data));

        return result;
      })
      .catch((error) => {
        //  axios throws and error for non-20X status responses.
        //  when the UP is not found, it results in a 404 error
        // console.log('get_profile error:', error.response.data);
        result = { status: "notFound", data: error.response.data };
        console.log("error when getting traits");
        return null;
      });
  };

  getEventsByPhone = async (phone) => {
    const axios = require("axios");
    const username = profileToken;
    const password = "";
    // encode base64
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");

    // handle encoding of e.164
    if (phone.trim().includes("+")) {
      phone = phone.replace("+", "%2B");
    } else {
      phone = "%2B" + phone.replace(" ", "");
    }

    // set headers
    const config = {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    };

    return await axios
      .get(
        `https://profiles.segment.com/v1/spaces/${spaceId}/collections/users/profiles/phone:${phone}/events?exclude=${exclude_events}`,
        config
      )

      .then((response) => {
        console.log('Get Events success: ', response.data);
        return response.data;
      })
      .catch((error) => {
        console.log("Error while getting events");
        console.error(error);
      });
  };

  getEvents = (id) => {
    const axios = require("axios");
    const username = profileToken;
    const password = "";
    // encode base64
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");

    // set headers
    const config = {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    };

    // HTTP GET
    axios
      .get(
        `https://profiles.segment.com/v1/spaces/${spaceId}/collections/users/profiles/user_id:${id}/events`,
        config
      )
      .then((response) => {
        console.log(response.data.data);
      })
      .catch((error) => {
        console.log("Error on Authentication");
        console.error(error);
      });
  };
}

module.exports = SegmentService;
