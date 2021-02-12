const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
  },
  room: { type: String, required: true, lowercase: true },
  message: { type: String, required: true, lowercase: true },
  date_sent: { type: Date, required: true },
});

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
