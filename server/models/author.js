const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 4,
  },
  born: Number,
});

module.exports = mongoose.model("Author", schema);