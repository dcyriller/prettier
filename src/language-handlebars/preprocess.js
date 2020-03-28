"use strict";

const transform = require("@glimmer/syntax").traverse;

const {
  CSS_DISPLAY_TAGS,
  CSS_DISPLAY_DEFAULT,
  CSS_WHITE_SPACE_TAGS,
  CSS_WHITE_SPACE_DEFAULT,
} = require("../language-html/constants.evaluate");

const { isNodeOfSomeType } = require("./utils");

const PREPROCESS_PIPELINE = [
  addCssDisplay,
  addIsSpaceSensitive,
  extractWhitespaces,
];

/* UTILS */

function isLeadingSpaceSensitiveNode(node, parentNode) {
  const index = parentNode.children.findIndex((n) => n === node);
  const previousNode = parentNode.children[index - 1];

  if (
    isNodeOfSomeType(node, ["TextNode", "MustacheStatement"]) &&
    previousNode &&
    isNodeOfSomeType(previousNode, ["TextNode", "MustacheStatement"])
  ) {
    return true;
  }

  if (!parentNode || parentNode.cssDisplay === "none") {
    return false;
  }

  if (isPreLikeNode(parentNode)) {
    return true;
  }

  if (
    !previousNode &&
    (isNodeOfSomeType(parentNode, ["Block", "Program", "Template"]) ||
      (isPreLikeNode(node) && parentNode) ||
      !isFirstChildLeadingSpaceSensitiveCssDisplay(parentNode.cssDisplay))
  ) {
    return false;
  }

  if (
    previousNode &&
    !isNextLeadingSpaceSensitiveCssDisplay(previousNode.cssDisplay)
  ) {
    return false;
  }

  return true;
}

function isTrailingSpaceSensitiveNode(node, parentNode) {
  const index = parentNode.children.findIndex((n) => n === node);
  const nextNode = parentNode.children[index + 1];

  if (
    isNodeOfSomeType(node, ["TextNode", "MustacheStatement"]) &&
    nextNode &&
    isNodeOfSomeType(nextNode, ["TextNode", "MustacheStatement"])
  ) {
    return true;
  }

  if (!parentNode || parentNode.cssDisplay === "none") {
    return false;
  }

  if (isPreLikeNode(parentNode)) {
    return true;
  }

  if (
    !nextNode &&
    (isNodeOfSomeType(parentNode, ["Block", "Program", "Template"]) ||
      (isPreLikeNode(node) && parentNode) ||
      !isLastChildTrailingSpaceSensitiveCssDisplay(parentNode.cssDisplay))
  ) {
    return false;
  }

  if (
    nextNode &&
    !isPrevTrailingSpaceSensitiveCssDisplay(nextNode.cssDisplay)
  ) {
    return false;
  }

  return true;
}

function isBlockLikeCssDisplay(cssDisplay) {
  return (
    cssDisplay === "block" ||
    cssDisplay === "list-item" ||
    cssDisplay.startsWith("table")
  );
}

function isFirstChildLeadingSpaceSensitiveCssDisplay(cssDisplay) {
  return !isBlockLikeCssDisplay(cssDisplay) && cssDisplay !== "inline-block";
}

function isLastChildTrailingSpaceSensitiveCssDisplay(cssDisplay) {
  return !isBlockLikeCssDisplay(cssDisplay) && cssDisplay !== "inline-block";
}

function isPrevTrailingSpaceSensitiveCssDisplay(cssDisplay) {
  return !isBlockLikeCssDisplay(cssDisplay);
}

function isNextLeadingSpaceSensitiveCssDisplay(cssDisplay) {
  return !isBlockLikeCssDisplay(cssDisplay);
}

function isDanglingSpaceSensitiveCssDisplay(cssDisplay) {
  return !isBlockLikeCssDisplay(cssDisplay) && cssDisplay !== "inline-block";
}

function isPreLikeNode(node) {
  return getNodeCssStyleWhiteSpace(node).startsWith("pre");
}

function getNodeCssStyleWhiteSpace(node) {
  return (
    (isNodeOfSomeType(node, ["ElementNode"]) &&
      CSS_WHITE_SPACE_TAGS[node.tag]) ||
    CSS_WHITE_SPACE_DEFAULT
  );
}

function isWhitespaceSensitiveNode(node) {
  return (
    isNodeOfSomeType(node, ["MustacheStatement"]) ||
    isIndentationSensitiveNode(node)
  );
}

function isIndentationSensitiveNode(node) {
  return getNodeCssStyleWhiteSpace(node).startsWith("pre");
}

function getElementNodeCssStyleDisplay(node, comment, options) {
  if (comment) {
    // {{! display: block }}
    const match = comment.match(/^\s*display:\s*([a-z]+)\s*$/);
    if (match) {
      return match[1];
    }
  }

  switch (options.htmlWhitespaceSensitivity) {
    case "strict":
      return "inline";
    case "ignore":
      return "block";
    default:
      return (
        (isNodeOfSomeType(node, ["ElementNode"]) &&
          CSS_DISPLAY_TAGS[node.tag]) ||
        CSS_DISPLAY_DEFAULT
      );
  }
}

/* VISITORS */

/**
 * - add `hasLeadingSpaces` field
 * - add `hasTrailingSpaces` field
 * - add `hasDanglingSpaces` field for parent nodes
 * - add `isWhitespaceSensitive`, `isIndentationSensitive` field for text nodes
 * - remove insensitive whitespaces
 */
function extractWhitespaces(/* options*/) {
  const TYPE_WHITESPACE = "whitespace";

  return {
    ElementNode(node) {
      if (
        node.children.length === 0 ||
        (node.children.length === 1 &&
          isNodeOfSomeType(node.children[0], ["TextNode"]) &&
          node.children[0].chars.trim().length === 0)
      ) {
        node.hasDanglingSpaces = node.children.length !== 0;
        node.children = [];
        return node;
      }

      // TODO: is isWhitespaceSensitiveNode legit????
      const isWhitespaceSensitive = isWhitespaceSensitiveNode(node);
      const isIndentationSensitive = isIndentationSensitiveNode(node);

      node.isWhitespaceSensitive = isWhitespaceSensitive;
      node.isIndentationSensitive = isIndentationSensitive;
      node.children = node.children
        // extract whitespace nodes
        .reduce((newChildren, child) => {
          if (!isNodeOfSomeType(child, ["TextNode"]) || isWhitespaceSensitive) {
            return newChildren.concat(child);
          }

          const localChildren = [];

          const [, leadingSpaces, text, trailingSpaces] = child.chars.match(
            /^(\s*)([\s\S]*?)(\s*)$/
          );

          if (leadingSpaces) {
            localChildren.push({ type: TYPE_WHITESPACE });
          }

          if (text) {
            localChildren.push({ ...child, chars: text });
          }

          if (trailingSpaces) {
            localChildren.push({ type: TYPE_WHITESPACE });
          }

          return newChildren.concat(localChildren);
        }, [])
        // set hasLeadingSpaces/hasTrailingSpaces and filter whitespace nodes
        .reduce((newChildren, child, i, children) => {
          if (child.type === TYPE_WHITESPACE) {
            return newChildren;
          }

          const hasLeadingSpaces =
            i !== 0 && children[i - 1].type === TYPE_WHITESPACE;
          const hasTrailingSpaces =
            i !== children.length - 1 &&
            children[i + 1].type === TYPE_WHITESPACE;

          return newChildren.concat({
            ...child,
            hasLeadingSpaces,
            hasTrailingSpaces,
          });
        }, []);
      return node;
    },
  };
}

/**
 * - add `cssDisplay` field, can be `block`, `inline`, `inline-block`, `table`...
 */
function addCssDisplay(options) {
  let comment;
  return {
    BlockStatement(node) {
      node.cssDisplay = "block";
      return node;
    },
    CommentStatement(node) {
      node.cssDisplay = "block";
      return node;
    },
    MustacheStatement(node) {
      node.cssDisplay = "block";
      return node;
    },
    TextNode(node) {
      node.cssDisplay = "inline";
      return node;
    },
    MustacheCommentStatement(node) {
      node.cssDisplay = "block";
      return node;
    },
    ElementNode(node) {
      node.cssDisplay = getElementNodeCssStyleDisplay(node, comment, options);

      comment = null;

      return node;
    },
  };
}

/**
 * - add `isLeadingSpaceSensitive` field
 * - add `isTrailingSpaceSensitive` field
 * - add `isDanglingSpaceSensitive` field for parent nodes
 */
function addIsSpaceSensitive(/* options */) {
  return {
    ElementNode(node) {
      if (node.children.length === 0) {
        return node;
      }

      if (
        node.children.length === 1 &&
        isNodeOfSomeType(node.children[0], ["TextNode"])
      ) {
        node.isDanglingSpaceSensitive = isDanglingSpaceSensitiveCssDisplay(
          node.cssDisplay
        );
        return node;
      }

      node.children = node.children
        .map((child) => {
          return {
            ...child,
            isLeadingSpaceSensitive: isLeadingSpaceSensitiveNode(child, node),
            isTrailingSpaceSensitive: isTrailingSpaceSensitiveNode(child, node),
          };
        })
        .map((child, index, children) => ({
          ...child,
          isLeadingSpaceSensitive:
            index === 0
              ? child.isLeadingSpaceSensitive
              : children[index - 1].isTrailingSpaceSensitive &&
                child.isLeadingSpaceSensitive,
          isTrailingSpaceSensitive:
            index === children.length - 1
              ? child.isTrailingSpaceSensitive
              : children[index + 1].isLeadingSpaceSensitive &&
                child.isTrailingSpaceSensitive,
        }));

      return node;
    },
  };
}

function preprocess(ast, options) {
  for (const fn of PREPROCESS_PIPELINE) {
    const visitor = fn(options);
    transform(ast, visitor);
  }

  return ast;
}

module.exports = preprocess;
