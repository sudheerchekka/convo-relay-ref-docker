const EventEmitter = require("events");

class TextService extends EventEmitter {
  constructor(websocket) {
    super();
    this.ws = websocket;
  }

  sendText(text, last) {
    //console.log("Sending text: ".yellow, text, last);
    this.ws.send(
      JSON.stringify({
        type: "text",
        token: text,
        last: last,
      })
    );
  }

  setLang(language) {
    console.log("setLang: |", language);
    this.ws.send(
      JSON.stringify({
        type: "language",
        ttsLanguage: language,
        transcriptionLanguage: language,
      })
    );
  }
}

module.exports = { TextService };
