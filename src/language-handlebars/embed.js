"use strict";

const {
  builders: { softline, concat },
  utils: { stripTrailingHardline }
} = require("../doc");

function embed(path, print, textToDoc, options) {
  const node = path.getValue();
  // const parent = path.getParentNode();

  switch (node.type) {
    case "ElementNode": {
      const text = concat(path.map(print, "children"));
			debugger;
      return stripTrailingHardline(textToDoc(text, { parser: "html" }));
    }
  }
}

module.exports = embed;
