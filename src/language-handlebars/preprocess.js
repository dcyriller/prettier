"use strict";

const { format } = require("../index");

function preprocess(text) {
  return format(text, { parser: "html" });
}

module.exports = preprocess;
