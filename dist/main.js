"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => RationalDeliriumPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian8 = require("obsidian");

// src/scope.ts
var KNOWLEDGE_ROOTS = [
  "CASES",
  "EVIDENCE",
  "HYPOTHESES",
  "LOOPS",
  "ARCHIVE"
];
var FORBIDDEN_DATA_PREFIXES = [
  ".astra/",
  ".obsidian/",
  "Templates/",
  "Attachments/",
  "00_HOME/RD_DEMO/"
];
function normalizeVaultPath(path) {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "");
}
function rootOf(path) {
  const norm = normalizeVaultPath(path);
  return norm.split("/")[0] ?? "";
}
function isCandidatePath(path) {
  return KNOWLEDGE_ROOTS.includes(rootOf(path));
}
function isForbiddenDataSource(path) {
  const norm = normalizeVaultPath(path);
  return FORBIDDEN_DATA_PREFIXES.some(
    (prefix) => norm === prefix.slice(0, -1) || norm.startsWith(prefix)
  );
}

// src/platform/obsidian-navigation.ts
var import_obsidian = require("obsidian");

// src/platform/navigation-core.ts
var NATIVE_LOCAL_GRAPH_COMMAND_ID = "graph:open-local";

// src/model.ts
var RD_OBJECT_TYPES = [
  "case",
  "evidence",
  "hypothesis",
  "loop"
];
var FRONTMATTER_RELATION_FIELDS = [
  "related",
  "supports",
  "supported_by",
  "contradicts",
  "contradicted_by"
];
var BODY_RELATION_PREDICATES = [
  "derived_from",
  "repeats_in",
  "observed_in"
];

// node_modules/yaml/browser/dist/nodes/identity.js
var ALIAS = Symbol.for("yaml.alias");
var DOC = Symbol.for("yaml.document");
var MAP = Symbol.for("yaml.map");
var PAIR = Symbol.for("yaml.pair");
var SCALAR = Symbol.for("yaml.scalar");
var SEQ = Symbol.for("yaml.seq");
var NODE_TYPE = Symbol.for("yaml.node.type");
var isAlias = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === ALIAS;
var isDocument = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === DOC;
var isMap = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === MAP;
var isPair = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === PAIR;
var isScalar = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === SCALAR;
var isSeq = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === SEQ;
function isCollection(node2) {
  if (node2 && typeof node2 === "object")
    switch (node2[NODE_TYPE]) {
      case MAP:
      case SEQ:
        return true;
    }
  return false;
}
function isNode(node2) {
  if (node2 && typeof node2 === "object")
    switch (node2[NODE_TYPE]) {
      case ALIAS:
      case MAP:
      case SCALAR:
      case SEQ:
        return true;
    }
  return false;
}
var hasAnchor = (node2) => (isScalar(node2) || isCollection(node2)) && !!node2.anchor;

// node_modules/yaml/browser/dist/visit.js
var BREAK = Symbol("break visit");
var SKIP = Symbol("skip children");
var REMOVE = Symbol("remove node");
function visit(node2, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node2)) {
    const cd = visit_(null, node2.contents, visitor_, Object.freeze([node2]));
    if (cd === REMOVE)
      node2.contents = null;
  } else
    visit_(null, node2, visitor_, Object.freeze([]));
}
visit.BREAK = BREAK;
visit.SKIP = SKIP;
visit.REMOVE = REMOVE;
function visit_(key, node2, visitor, path) {
  const ctrl = callVisitor(key, node2, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key, path, ctrl);
    return visit_(key, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node2)) {
      path = Object.freeze(path.concat(node2));
      for (let i = 0; i < node2.items.length; ++i) {
        const ci = visit_(i, node2.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node2.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node2)) {
      path = Object.freeze(path.concat(node2));
      const ck = visit_("key", node2.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node2.key = null;
      const cv = visit_("value", node2.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node2.value = null;
    }
  }
  return ctrl;
}
async function visitAsync(node2, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node2)) {
    const cd = await visitAsync_(null, node2.contents, visitor_, Object.freeze([node2]));
    if (cd === REMOVE)
      node2.contents = null;
  } else
    await visitAsync_(null, node2, visitor_, Object.freeze([]));
}
visitAsync.BREAK = BREAK;
visitAsync.SKIP = SKIP;
visitAsync.REMOVE = REMOVE;
async function visitAsync_(key, node2, visitor, path) {
  const ctrl = await callVisitor(key, node2, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key, path, ctrl);
    return visitAsync_(key, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node2)) {
      path = Object.freeze(path.concat(node2));
      for (let i = 0; i < node2.items.length; ++i) {
        const ci = await visitAsync_(i, node2.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node2.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node2)) {
      path = Object.freeze(path.concat(node2));
      const ck = await visitAsync_("key", node2.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node2.key = null;
      const cv = await visitAsync_("value", node2.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node2.value = null;
    }
  }
  return ctrl;
}
function initVisitor(visitor) {
  if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
    return Object.assign({
      Alias: visitor.Node,
      Map: visitor.Node,
      Scalar: visitor.Node,
      Seq: visitor.Node
    }, visitor.Value && {
      Map: visitor.Value,
      Scalar: visitor.Value,
      Seq: visitor.Value
    }, visitor.Collection && {
      Map: visitor.Collection,
      Seq: visitor.Collection
    }, visitor);
  }
  return visitor;
}
function callVisitor(key, node2, visitor, path) {
  if (typeof visitor === "function")
    return visitor(key, node2, path);
  if (isMap(node2))
    return visitor.Map?.(key, node2, path);
  if (isSeq(node2))
    return visitor.Seq?.(key, node2, path);
  if (isPair(node2))
    return visitor.Pair?.(key, node2, path);
  if (isScalar(node2))
    return visitor.Scalar?.(key, node2, path);
  if (isAlias(node2))
    return visitor.Alias?.(key, node2, path);
  return void 0;
}
function replaceNode(key, path, node2) {
  const parent = path[path.length - 1];
  if (isCollection(parent)) {
    parent.items[key] = node2;
  } else if (isPair(parent)) {
    if (key === "key")
      parent.key = node2;
    else
      parent.value = node2;
  } else if (isDocument(parent)) {
    parent.contents = node2;
  } else {
    const pt = isAlias(parent) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${pt} parent`);
  }
}

// node_modules/yaml/browser/dist/doc/directives.js
var escapeChars = {
  "!": "%21",
  ",": "%2C",
  "[": "%5B",
  "]": "%5D",
  "{": "%7B",
  "}": "%7D"
};
var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
var Directives = class _Directives {
  constructor(yaml, tags) {
    this.docStart = null;
    this.docEnd = false;
    this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
    this.tags = Object.assign({}, _Directives.defaultTags, tags);
  }
  clone() {
    const copy = new _Directives(this.yaml, this.tags);
    copy.docStart = this.docStart;
    return copy;
  }
  /**
   * During parsing, get a Directives instance for the current document and
   * update the stream state according to the current version's spec.
   */
  atDocument() {
    const res = new _Directives(this.yaml, this.tags);
    switch (this.yaml.version) {
      case "1.1":
        this.atNextDocument = true;
        break;
      case "1.2":
        this.atNextDocument = false;
        this.yaml = {
          explicit: _Directives.defaultYaml.explicit,
          version: "1.2"
        };
        this.tags = Object.assign({}, _Directives.defaultTags);
        break;
    }
    return res;
  }
  /**
   * @param onError - May be called even if the action was successful
   * @returns `true` on success
   */
  add(line, onError) {
    if (this.atNextDocument) {
      this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
      this.tags = Object.assign({}, _Directives.defaultTags);
      this.atNextDocument = false;
    }
    const parts = line.trim().split(/[ \t]+/);
    const name = parts.shift();
    switch (name) {
      case "%TAG": {
        if (parts.length !== 2) {
          onError(0, "%TAG directive should contain exactly two parts");
          if (parts.length < 2)
            return false;
        }
        const [handle, prefix] = parts;
        this.tags[handle] = prefix;
        return true;
      }
      case "%YAML": {
        this.yaml.explicit = true;
        if (parts.length !== 1) {
          onError(0, "%YAML directive should contain exactly one part");
          return false;
        }
        const [version] = parts;
        if (version === "1.1" || version === "1.2") {
          this.yaml.version = version;
          return true;
        } else {
          const isValid = /^\d+\.\d+$/.test(version);
          onError(6, `Unsupported YAML version ${version}`, isValid);
          return false;
        }
      }
      default:
        onError(0, `Unknown directive ${name}`, true);
        return false;
    }
  }
  /**
   * Resolves a tag, matching handles to those defined in %TAG directives.
   *
   * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
   *   `'!local'` tag, or `null` if unresolvable.
   */
  tagName(source, onError) {
    if (source === "!")
      return "!";
    if (source[0] !== "!") {
      onError(`Not a valid tag: ${source}`);
      return null;
    }
    if (source[1] === "<") {
      const verbatim = source.slice(2, -1);
      if (verbatim === "!" || verbatim === "!!") {
        onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
        return null;
      }
      if (source[source.length - 1] !== ">")
        onError("Verbatim tags must end with a >");
      return verbatim;
    }
    const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
    if (!suffix)
      onError(`The ${source} tag has no suffix`);
    const prefix = this.tags[handle];
    if (prefix) {
      try {
        return prefix + decodeURIComponent(suffix);
      } catch (error) {
        onError(String(error));
        return null;
      }
    }
    if (handle === "!")
      return source;
    onError(`Could not resolve tag: ${source}`);
    return null;
  }
  /**
   * Given a fully resolved tag, returns its printable string form,
   * taking into account current tag prefixes and defaults.
   */
  tagString(tag) {
    for (const [handle, prefix] of Object.entries(this.tags)) {
      if (tag.startsWith(prefix))
        return handle + escapeTagName(tag.substring(prefix.length));
    }
    return tag[0] === "!" ? tag : `!<${tag}>`;
  }
  toString(doc) {
    const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
    const tagEntries = Object.entries(this.tags);
    let tagNames;
    if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
      const tags = {};
      visit(doc.contents, (_key, node2) => {
        if (isNode(node2) && node2.tag)
          tags[node2.tag] = true;
      });
      tagNames = Object.keys(tags);
    } else
      tagNames = [];
    for (const [handle, prefix] of tagEntries) {
      if (handle === "!!" && prefix === "tag:yaml.org,2002:")
        continue;
      if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
        lines.push(`%TAG ${handle} ${prefix}`);
    }
    return lines.join("\n");
  }
};
Directives.defaultYaml = { explicit: false, version: "1.2" };
Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };

// node_modules/yaml/browser/dist/doc/anchors.js
function anchorIsValid(anchor) {
  if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
    const sa = JSON.stringify(anchor);
    const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
    throw new Error(msg);
  }
  return true;
}
function anchorNames(root) {
  const anchors = /* @__PURE__ */ new Set();
  visit(root, {
    Value(_key, node2) {
      if (node2.anchor)
        anchors.add(node2.anchor);
    }
  });
  return anchors;
}
function findNewAnchor(prefix, exclude) {
  for (let i = 1; true; ++i) {
    const name = `${prefix}${i}`;
    if (!exclude.has(name))
      return name;
  }
}
function createNodeAnchors(doc, prefix) {
  const aliasObjects = [];
  const sourceObjects = /* @__PURE__ */ new Map();
  let prevAnchors = null;
  return {
    onAnchor: (source) => {
      aliasObjects.push(source);
      prevAnchors ?? (prevAnchors = anchorNames(doc));
      const anchor = findNewAnchor(prefix, prevAnchors);
      prevAnchors.add(anchor);
      return anchor;
    },
    /**
     * With circular references, the source node is only resolved after all
     * of its child nodes are. This is why anchors are set only after all of
     * the nodes have been created.
     */
    setAnchors: () => {
      for (const source of aliasObjects) {
        const ref = sourceObjects.get(source);
        if (typeof ref === "object" && ref.anchor && (isScalar(ref.node) || isCollection(ref.node))) {
          ref.node.anchor = ref.anchor;
        } else {
          const error = new Error("Failed to resolve repeated object (this should not happen)");
          error.source = source;
          throw error;
        }
      }
    },
    sourceObjects
  };
}

// node_modules/yaml/browser/dist/doc/applyReviver.js
function applyReviver(reviver, obj, key, val) {
  if (val && typeof val === "object") {
    if (Array.isArray(val)) {
      for (let i = 0, len = val.length; i < len; ++i) {
        const v0 = val[i];
        const v1 = applyReviver(reviver, val, String(i), v0);
        if (v1 === void 0)
          delete val[i];
        else if (v1 !== v0)
          val[i] = v1;
      }
    } else if (val instanceof Map) {
      for (const k of Array.from(val.keys())) {
        const v0 = val.get(k);
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          val.delete(k);
        else if (v1 !== v0)
          val.set(k, v1);
      }
    } else if (val instanceof Set) {
      for (const v0 of Array.from(val)) {
        const v1 = applyReviver(reviver, val, v0, v0);
        if (v1 === void 0)
          val.delete(v0);
        else if (v1 !== v0) {
          val.delete(v0);
          val.add(v1);
        }
      }
    } else {
      for (const [k, v0] of Object.entries(val)) {
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          delete val[k];
        else if (v1 !== v0)
          val[k] = v1;
      }
    }
  }
  return reviver.call(obj, key, val);
}

// node_modules/yaml/browser/dist/nodes/toJS.js
function toJS(value, arg, ctx) {
  if (Array.isArray(value))
    return value.map((v, i) => toJS(v, String(i), ctx));
  if (value && typeof value.toJSON === "function") {
    if (!ctx || !hasAnchor(value))
      return value.toJSON(arg, ctx);
    const data = { aliasCount: 0, count: 1, res: void 0 };
    ctx.anchors.set(value, data);
    ctx.onCreate = (res2) => {
      data.res = res2;
      delete ctx.onCreate;
    };
    const res = value.toJSON(arg, ctx);
    if (ctx.onCreate)
      ctx.onCreate(res);
    return res;
  }
  if (typeof value === "bigint" && !ctx?.keep)
    return Number(value);
  return value;
}

// node_modules/yaml/browser/dist/nodes/Node.js
var NodeBase = class {
  constructor(type) {
    Object.defineProperty(this, NODE_TYPE, { value: type });
  }
  /** Create a copy of this node.  */
  clone() {
    const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /** A plain JavaScript representation of this node. */
  toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
    if (!isDocument(doc))
      throw new TypeError("A document argument is required");
    const ctx = {
      anchors: /* @__PURE__ */ new Map(),
      doc,
      keep: true,
      mapAsMap: mapAsMap === true,
      mapKeyWarned: false,
      maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
    };
    const res = toJS(this, "", ctx);
    if (typeof onAnchor === "function")
      for (const { count, res: res2 } of ctx.anchors.values())
        onAnchor(res2, count);
    return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
  }
};

// node_modules/yaml/browser/dist/nodes/Alias.js
var Alias = class extends NodeBase {
  constructor(source) {
    super(ALIAS);
    this.source = source;
    Object.defineProperty(this, "tag", {
      set() {
        throw new Error("Alias nodes cannot have tags");
      }
    });
  }
  /**
   * Resolve the value of this alias within `doc`, finding the last
   * instance of the `source` anchor before this node.
   */
  resolve(doc, ctx) {
    if (ctx?.maxAliasCount === 0)
      throw new ReferenceError("Alias resolution is disabled");
    let nodes;
    if (ctx?.aliasResolveCache) {
      nodes = ctx.aliasResolveCache;
    } else {
      nodes = [];
      visit(doc, {
        Node: (_key, node2) => {
          if (isAlias(node2) || hasAnchor(node2))
            nodes.push(node2);
        }
      });
      if (ctx)
        ctx.aliasResolveCache = nodes;
    }
    let found = void 0;
    for (const node2 of nodes) {
      if (node2 === this)
        break;
      if (node2.anchor === this.source)
        found = node2;
    }
    if (found && ctx) {
      const { anchors, doc: doc2, maxAliasCount } = ctx;
      let data = anchors.get(found);
      if (!data) {
        toJS(found, null, ctx);
        data = anchors.get(found);
      }
      if (data?.res === void 0) {
        const msg = "This should not happen: Alias anchor was not resolved?";
        throw new ReferenceError(msg);
      }
      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0)
          data.aliasCount = getAliasCount(doc2, found, anchors);
        if (data.count * data.aliasCount > maxAliasCount) {
          const msg = "Excessive alias count indicates a resource exhaustion attack";
          throw new ReferenceError(msg);
        }
      }
    }
    return found;
  }
  toJSON(_arg, ctx) {
    if (!ctx)
      return { source: this.source };
    const source = this.resolve(ctx.doc, ctx);
    if (!source) {
      const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(msg);
    }
    return ctx.anchors.get(source).res;
  }
  toString(ctx, _onComment, _onChompKeep) {
    const src = `*${this.source}`;
    if (ctx) {
      anchorIsValid(this.source);
      if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(msg);
      }
      if (ctx.implicitKey)
        return `${src} `;
    }
    return src;
  }
};
function getAliasCount(doc, node2, anchors) {
  if (isAlias(node2)) {
    const source = node2.resolve(doc);
    const anchor = anchors && source && anchors.get(source);
    return anchor ? anchor.count * anchor.aliasCount : 0;
  } else if (isCollection(node2)) {
    let count = 0;
    for (const item of node2.items) {
      const c = getAliasCount(doc, item, anchors);
      if (c > count)
        count = c;
    }
    return count;
  } else if (isPair(node2)) {
    const kc = getAliasCount(doc, node2.key, anchors);
    const vc = getAliasCount(doc, node2.value, anchors);
    return Math.max(kc, vc);
  }
  return 1;
}

// node_modules/yaml/browser/dist/nodes/Scalar.js
var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
var Scalar = class extends NodeBase {
  constructor(value) {
    super(SCALAR);
    this.value = value;
  }
  toJSON(arg, ctx) {
    return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
  }
  toString() {
    return String(this.value);
  }
};
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";

// node_modules/yaml/browser/dist/doc/createNode.js
var defaultTagPrefix = "tag:yaml.org,2002:";
function findTagObject(value, tagName, tags) {
  if (tagName) {
    const match = tags.filter((t) => t.tag === tagName);
    const tagObj = match.find((t) => !t.format) ?? match[0];
    if (!tagObj)
      throw new Error(`Tag ${tagName} not found`);
    return tagObj;
  }
  return tags.find((t) => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
  if (isDocument(value))
    value = value.contents;
  if (isNode(value))
    return value;
  if (isPair(value)) {
    const map2 = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
    map2.items.push(value);
    return map2;
  }
  if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
    value = value.valueOf();
  }
  const { aliasDuplicateObjects, onAnchor, onTagObj, schema: schema4, sourceObjects } = ctx;
  let ref = void 0;
  if (aliasDuplicateObjects && value && typeof value === "object") {
    ref = sourceObjects.get(value);
    if (ref) {
      ref.anchor ?? (ref.anchor = onAnchor(value));
      return new Alias(ref.anchor);
    } else {
      ref = { anchor: null, node: null };
      sourceObjects.set(value, ref);
    }
  }
  if (tagName?.startsWith("!!"))
    tagName = defaultTagPrefix + tagName.slice(2);
  let tagObj = findTagObject(value, tagName, schema4.tags);
  if (!tagObj) {
    if (value && typeof value.toJSON === "function") {
      value = value.toJSON();
    }
    if (!value || typeof value !== "object") {
      const node3 = new Scalar(value);
      if (ref)
        ref.node = node3;
      return node3;
    }
    tagObj = value instanceof Map ? schema4[MAP] : Symbol.iterator in Object(value) ? schema4[SEQ] : schema4[MAP];
  }
  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  }
  const node2 = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
  if (tagName)
    node2.tag = tagName;
  else if (!tagObj.default)
    node2.tag = tagObj.tag;
  if (ref)
    ref.node = node2;
  return node2;
}

// node_modules/yaml/browser/dist/nodes/Collection.js
function collectionFromPath(schema4, path, value) {
  let v = value;
  for (let i = path.length - 1; i >= 0; --i) {
    const k = path[i];
    if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
      const a = [];
      a[k] = v;
      v = a;
    } else {
      v = /* @__PURE__ */ new Map([[k, v]]);
    }
  }
  return createNode(v, void 0, {
    aliasDuplicateObjects: false,
    keepUndefined: false,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: schema4,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
var Collection = class extends NodeBase {
  constructor(type, schema4) {
    super(type);
    Object.defineProperty(this, "schema", {
      value: schema4,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  /**
   * Create a copy of this collection.
   *
   * @param schema - If defined, overwrites the original's schema
   */
  clone(schema4) {
    const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    if (schema4)
      copy.schema = schema4;
    copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema4) : it);
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /**
   * Adds a value to the collection. For `!!map` and `!!omap` the value must
   * be a Pair instance or a `{ key, value }` object, which may not have a key
   * that already exists in the map.
   */
  addIn(path, value) {
    if (isEmptyPath(path))
      this.add(value);
    else {
      const [key, ...rest] = path;
      const node2 = this.get(key, true);
      if (isCollection(node2))
        node2.addIn(rest, value);
      else if (node2 === void 0 && this.schema)
        this.set(key, collectionFromPath(this.schema, rest, value));
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  }
  /**
   * Removes a value from the collection.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(path) {
    const [key, ...rest] = path;
    if (rest.length === 0)
      return this.delete(key);
    const node2 = this.get(key, true);
    if (isCollection(node2))
      return node2.deleteIn(rest);
    else
      throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(path, keepScalar) {
    const [key, ...rest] = path;
    const node2 = this.get(key, true);
    if (rest.length === 0)
      return !keepScalar && isScalar(node2) ? node2.value : node2;
    else
      return isCollection(node2) ? node2.getIn(rest, keepScalar) : void 0;
  }
  hasAllNullValues(allowScalar) {
    return this.items.every((node2) => {
      if (!isPair(node2))
        return false;
      const n = node2.value;
      return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
    });
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   */
  hasIn(path) {
    const [key, ...rest] = path;
    if (rest.length === 0)
      return this.has(key);
    const node2 = this.get(key, true);
    return isCollection(node2) ? node2.hasIn(rest) : false;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(path, value) {
    const [key, ...rest] = path;
    if (rest.length === 0) {
      this.set(key, value);
    } else {
      const node2 = this.get(key, true);
      if (isCollection(node2))
        node2.setIn(rest, value);
      else if (node2 === void 0 && this.schema)
        this.set(key, collectionFromPath(this.schema, rest, value));
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyComment.js
var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(comment, indent) {
  if (/^\n+$/.test(comment))
    return comment.substring(1);
  return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;

// node_modules/yaml/browser/dist/stringify/foldFlowLines.js
var FOLD_FLOW = "flow";
var FOLD_BLOCK = "block";
var FOLD_QUOTED = "quoted";
function foldFlowLines(text3, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
  if (!lineWidth || lineWidth < 0)
    return text3;
  if (lineWidth < minContentWidth)
    minContentWidth = 0;
  const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
  if (text3.length <= endStep)
    return text3;
  const folds = [];
  const escapedFolds = {};
  let end = lineWidth - indent.length;
  if (typeof indentAtStart === "number") {
    if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
      folds.push(0);
    else
      end = lineWidth - indentAtStart;
  }
  let split = void 0;
  let prev = void 0;
  let overflow = false;
  let i = -1;
  let escStart = -1;
  let escEnd = -1;
  if (mode === FOLD_BLOCK) {
    i = consumeMoreIndentedLines(text3, i, indent.length);
    if (i !== -1)
      end = i + endStep;
  }
  for (let ch; ch = text3[i += 1]; ) {
    if (mode === FOLD_QUOTED && ch === "\\") {
      escStart = i;
      switch (text3[i + 1]) {
        case "x":
          i += 3;
          break;
        case "u":
          i += 5;
          break;
        case "U":
          i += 9;
          break;
        default:
          i += 1;
      }
      escEnd = i;
    }
    if (ch === "\n") {
      if (mode === FOLD_BLOCK)
        i = consumeMoreIndentedLines(text3, i, indent.length);
      end = i + indent.length + endStep;
      split = void 0;
    } else {
      if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
        const next = text3[i + 1];
        if (next && next !== " " && next !== "\n" && next !== "	")
          split = i;
      }
      if (i >= end) {
        if (split) {
          folds.push(split);
          end = split + endStep;
          split = void 0;
        } else if (mode === FOLD_QUOTED) {
          while (prev === " " || prev === "	") {
            prev = ch;
            ch = text3[i += 1];
            overflow = true;
          }
          const j = i > escEnd + 1 ? i - 2 : escStart - 1;
          if (escapedFolds[j])
            return text3;
          folds.push(j);
          escapedFolds[j] = true;
          end = j + endStep;
          split = void 0;
        } else {
          overflow = true;
        }
      }
    }
    prev = ch;
  }
  if (overflow && onOverflow)
    onOverflow();
  if (folds.length === 0)
    return text3;
  if (onFold)
    onFold();
  let res = text3.slice(0, folds[0]);
  for (let i2 = 0; i2 < folds.length; ++i2) {
    const fold = folds[i2];
    const end2 = folds[i2 + 1] || text3.length;
    if (fold === 0)
      res = `
${indent}${text3.slice(0, end2)}`;
    else {
      if (mode === FOLD_QUOTED && escapedFolds[fold])
        res += `${text3[fold]}\\`;
      res += `
${indent}${text3.slice(fold + 1, end2)}`;
    }
  }
  return res;
}
function consumeMoreIndentedLines(text3, i, indent) {
  let end = i;
  let start = i + 1;
  let ch = text3[start];
  while (ch === " " || ch === "	") {
    if (i < start + indent) {
      ch = text3[++i];
    } else {
      do {
        ch = text3[++i];
      } while (ch && ch !== "\n");
      end = i;
      start = i + 1;
      ch = text3[start];
    }
  }
  return end;
}

// node_modules/yaml/browser/dist/stringify/stringifyString.js
var getFoldOptions = (ctx, isBlock2) => ({
  indentAtStart: isBlock2 ? ctx.indent.length : ctx.indentAtStart,
  lineWidth: ctx.options.lineWidth,
  minContentWidth: ctx.options.minContentWidth
});
var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
function lineLengthOverLimit(str, lineWidth, indentLength) {
  if (!lineWidth || lineWidth < 0)
    return false;
  const limit = lineWidth - indentLength;
  const strLen = str.length;
  if (strLen <= limit)
    return false;
  for (let i = 0, start = 0; i < strLen; ++i) {
    if (str[i] === "\n") {
      if (i - start > limit)
        return true;
      start = i + 1;
      if (strLen - start <= limit)
        return false;
    }
  }
  return true;
}
function doubleQuotedString(value, ctx) {
  const json = JSON.stringify(value);
  if (ctx.options.doubleQuotedAsJSON)
    return json;
  const { implicitKey } = ctx;
  const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  let str = "";
  let start = 0;
  for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
    if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
      str += json.slice(start, i) + "\\ ";
      i += 1;
      start = i;
      ch = "\\";
    }
    if (ch === "\\")
      switch (json[i + 1]) {
        case "u":
          {
            str += json.slice(start, i);
            const code = json.substr(i + 2, 4);
            switch (code) {
              case "0000":
                str += "\\0";
                break;
              case "0007":
                str += "\\a";
                break;
              case "000b":
                str += "\\v";
                break;
              case "001b":
                str += "\\e";
                break;
              case "0085":
                str += "\\N";
                break;
              case "00a0":
                str += "\\_";
                break;
              case "2028":
                str += "\\L";
                break;
              case "2029":
                str += "\\P";
                break;
              default:
                if (code.substr(0, 2) === "00")
                  str += "\\x" + code.substr(2);
                else
                  str += json.substr(i, 6);
            }
            i += 5;
            start = i + 1;
          }
          break;
        case "n":
          if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
            i += 1;
          } else {
            str += json.slice(start, i) + "\n\n";
            while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
              str += "\n";
              i += 2;
            }
            str += indent;
            if (json[i + 2] === " ")
              str += "\\";
            i += 1;
            start = i + 1;
          }
          break;
        default:
          i += 1;
      }
  }
  str = start ? str + json.slice(start) : json;
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
  if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
    return doubleQuotedString(value, ctx);
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
  return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
  const { singleQuote } = ctx.options;
  let qs;
  if (singleQuote === false)
    qs = doubleQuotedString;
  else {
    const hasDouble = value.includes('"');
    const hasSingle = value.includes("'");
    if (hasDouble && !hasSingle)
      qs = singleQuotedString;
    else if (hasSingle && !hasDouble)
      qs = doubleQuotedString;
    else
      qs = singleQuote ? singleQuotedString : doubleQuotedString;
  }
  return qs(value, ctx);
}
var blockEndNewlines;
try {
  blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
} catch {
  blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
  const { blockQuote: blockQuote2, commentString, lineWidth } = ctx.options;
  if (!blockQuote2 || /\n[\t ]+$/.test(value)) {
    return quotedString(value, ctx);
  }
  const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
  const literal = blockQuote2 === "literal" ? true : blockQuote2 === "folded" || type === Scalar.BLOCK_FOLDED ? false : type === Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
  if (!value)
    return literal ? "|\n" : ">\n";
  let chomp;
  let endStart;
  for (endStart = value.length; endStart > 0; --endStart) {
    const ch = value[endStart - 1];
    if (ch !== "\n" && ch !== "	" && ch !== " ")
      break;
  }
  let end = value.substring(endStart);
  const endNlPos = end.indexOf("\n");
  if (endNlPos === -1) {
    chomp = "-";
  } else if (value === end || endNlPos !== end.length - 1) {
    chomp = "+";
    if (onChompKeep)
      onChompKeep();
  } else {
    chomp = "";
  }
  if (end) {
    value = value.slice(0, -end.length);
    if (end[end.length - 1] === "\n")
      end = end.slice(0, -1);
    end = end.replace(blockEndNewlines, `$&${indent}`);
  }
  let startWithSpace = false;
  let startEnd;
  let startNlPos = -1;
  for (startEnd = 0; startEnd < value.length; ++startEnd) {
    const ch = value[startEnd];
    if (ch === " ")
      startWithSpace = true;
    else if (ch === "\n")
      startNlPos = startEnd;
    else
      break;
  }
  let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
  if (start) {
    value = value.substring(start.length);
    start = start.replace(/\n+/g, `$&${indent}`);
  }
  const indentSize = indent ? "2" : "1";
  let header = (startWithSpace ? indentSize : "") + chomp;
  if (comment) {
    header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
    if (onComment)
      onComment();
  }
  if (!literal) {
    const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
    let literalFallback = false;
    const foldOptions = getFoldOptions(ctx, true);
    if (blockQuote2 !== "folded" && type !== Scalar.BLOCK_FOLDED) {
      foldOptions.onOverflow = () => {
        literalFallback = true;
      };
    }
    const body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
    if (!literalFallback)
      return `>${header}
${indent}${body}`;
  }
  value = value.replace(/\n+/g, `$&${indent}`);
  return `|${header}
${indent}${start}${value}${end}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
  const { type, value } = item;
  const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
  if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
    return quotedString(value, ctx);
  }
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
    return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
  }
  if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes("\n")) {
    return blockString(item, ctx, onComment, onChompKeep);
  }
  if (containsDocumentMarker(value)) {
    if (indent === "") {
      ctx.forceBlockIndent = true;
      return blockString(item, ctx, onComment, onChompKeep);
    } else if (implicitKey && indent === indentStep) {
      return quotedString(value, ctx);
    }
  }
  const str = value.replace(/\n+/g, `$&
${indent}`);
  if (actualString) {
    const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
    const { compat, tags } = ctx.doc.schema;
    if (tags.some(test) || compat?.some(test))
      return quotedString(value, ctx);
  }
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
  const { implicitKey, inFlow } = ctx;
  const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
  let { type } = item;
  if (type !== Scalar.QUOTE_DOUBLE) {
    if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
      type = Scalar.QUOTE_DOUBLE;
  }
  const _stringify = (_type) => {
    switch (_type) {
      case Scalar.BLOCK_FOLDED:
      case Scalar.BLOCK_LITERAL:
        return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
      case Scalar.QUOTE_DOUBLE:
        return doubleQuotedString(ss.value, ctx);
      case Scalar.QUOTE_SINGLE:
        return singleQuotedString(ss.value, ctx);
      case Scalar.PLAIN:
        return plainString(ss, ctx, onComment, onChompKeep);
      default:
        return null;
    }
  };
  let res = _stringify(type);
  if (res === null) {
    const { defaultKeyType, defaultStringType } = ctx.options;
    const t = implicitKey && defaultKeyType || defaultStringType;
    res = _stringify(t);
    if (res === null)
      throw new Error(`Unsupported default string type ${t}`);
  }
  return res;
}

// node_modules/yaml/browser/dist/stringify/stringify.js
function createStringifyContext(doc, options) {
  const opt = Object.assign({
    blockQuote: true,
    commentString: stringifyComment,
    defaultKeyType: null,
    defaultStringType: "PLAIN",
    directives: null,
    doubleQuotedAsJSON: false,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: "false",
    flowCollectionPadding: true,
    indentSeq: true,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: "null",
    simpleKeys: false,
    singleQuote: null,
    trailingComma: false,
    trueStr: "true",
    verifyAliasOrder: true
  }, doc.schema.toStringOptions, options);
  let inFlow;
  switch (opt.collectionStyle) {
    case "block":
      inFlow = false;
      break;
    case "flow":
      inFlow = true;
      break;
    default:
      inFlow = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc,
    flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
    inFlow,
    options: opt
  };
}
function getTagObject(tags, item) {
  if (item.tag) {
    const match = tags.filter((t) => t.tag === item.tag);
    if (match.length > 0)
      return match.find((t) => t.format === item.format) ?? match[0];
  }
  let tagObj = void 0;
  let obj;
  if (isScalar(item)) {
    obj = item.value;
    let match = tags.filter((t) => t.identify?.(obj));
    if (match.length > 1) {
      const testMatch = match.filter((t) => t.test);
      if (testMatch.length > 0)
        match = testMatch;
    }
    tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
  } else {
    obj = item;
    tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
  }
  if (!tagObj) {
    const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
    throw new Error(`Tag not resolved for ${name} value`);
  }
  return tagObj;
}
function stringifyProps(node2, tagObj, { anchors, doc }) {
  if (!doc.directives)
    return "";
  const props = [];
  const anchor = (isScalar(node2) || isCollection(node2)) && node2.anchor;
  if (anchor && anchorIsValid(anchor)) {
    anchors.add(anchor);
    props.push(`&${anchor}`);
  }
  const tag = node2.tag ?? (tagObj.default ? null : tagObj.tag);
  if (tag)
    props.push(doc.directives.tagString(tag));
  return props.join(" ");
}
function stringify(item, ctx, onComment, onChompKeep) {
  if (isPair(item))
    return item.toString(ctx, onComment, onChompKeep);
  if (isAlias(item)) {
    if (ctx.doc.directives)
      return item.toString(ctx);
    if (ctx.resolvedAliases?.has(item)) {
      throw new TypeError(`Cannot stringify circular structure without alias nodes`);
    } else {
      if (ctx.resolvedAliases)
        ctx.resolvedAliases.add(item);
      else
        ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
      item = item.resolve(ctx.doc);
    }
  }
  let tagObj = void 0;
  const node2 = isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
  tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node2));
  const props = stringifyProps(node2, tagObj, ctx);
  if (props.length > 0)
    ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
  const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node2, ctx, onComment, onChompKeep) : isScalar(node2) ? stringifyString(node2, ctx, onComment, onChompKeep) : node2.toString(ctx, onComment, onChompKeep);
  if (!props)
    return str;
  return isScalar(node2) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
}

// node_modules/yaml/browser/dist/stringify/stringifyPair.js
function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
  const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
  let keyComment = isNode(key) && key.comment || null;
  if (simpleKeys) {
    if (keyComment) {
      throw new Error("With simple keys, key nodes cannot have comments");
    }
    if (isCollection(key) || !isNode(key) && typeof key === "object") {
      const msg = "With simple keys, collection cannot be used as a key value";
      throw new Error(msg);
    }
  }
  let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || isCollection(key) || (isScalar(key) ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL : typeof key === "object"));
  ctx = Object.assign({}, ctx, {
    allNullValues: false,
    implicitKey: !explicitKey && (simpleKeys || !allNullValues),
    indent: indent + indentStep
  });
  let keyCommentDone = false;
  let chompKeep = false;
  let str = stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
  if (!explicitKey && !ctx.inFlow && str.length > 1024) {
    if (simpleKeys)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    explicitKey = true;
  }
  if (ctx.inFlow) {
    if (allNullValues || value == null) {
      if (keyCommentDone && onComment)
        onComment();
      return str === "" ? "?" : explicitKey ? `? ${str}` : str;
    }
  } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
    str = `? ${str}`;
    if (keyComment && !keyCommentDone) {
      str += lineComment(str, ctx.indent, commentString(keyComment));
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  if (keyCommentDone)
    keyComment = null;
  if (explicitKey) {
    if (keyComment)
      str += lineComment(str, ctx.indent, commentString(keyComment));
    str = `? ${str}
${indent}:`;
  } else {
    str = `${str}:`;
    if (keyComment)
      str += lineComment(str, ctx.indent, commentString(keyComment));
  }
  let vsb, vcb, valueComment;
  if (isNode(value)) {
    vsb = !!value.spaceBefore;
    vcb = value.commentBefore;
    valueComment = value.comment;
  } else {
    vsb = false;
    vcb = null;
    valueComment = null;
    if (value && typeof value === "object")
      value = doc.createNode(value);
  }
  ctx.implicitKey = false;
  if (!explicitKey && !keyComment && isScalar(value))
    ctx.indentAtStart = str.length + 1;
  chompKeep = false;
  if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor) {
    ctx.indent = ctx.indent.substring(2);
  }
  let valueCommentDone = false;
  const valueStr = stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
  let ws = " ";
  if (keyComment || vsb || vcb) {
    ws = vsb ? "\n" : "";
    if (vcb) {
      const cs = commentString(vcb);
      ws += `
${indentComment(cs, ctx.indent)}`;
    }
    if (valueStr === "" && !ctx.inFlow) {
      if (ws === "\n" && valueComment)
        ws = "\n\n";
    } else {
      ws += `
${ctx.indent}`;
    }
  } else if (!explicitKey && isCollection(value)) {
    const vs0 = valueStr[0];
    const nl0 = valueStr.indexOf("\n");
    const hasNewline = nl0 !== -1;
    const flow3 = ctx.inFlow ?? value.flow ?? value.items.length === 0;
    if (hasNewline || !flow3) {
      let hasPropsLine = false;
      if (hasNewline && (vs0 === "&" || vs0 === "!")) {
        let sp0 = valueStr.indexOf(" ");
        if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
          sp0 = valueStr.indexOf(" ", sp0 + 1);
        }
        if (sp0 === -1 || nl0 < sp0)
          hasPropsLine = true;
      }
      if (!hasPropsLine)
        ws = `
${ctx.indent}`;
    }
  } else if (valueStr === "" || valueStr[0] === "\n") {
    ws = "";
  }
  str += ws + valueStr;
  if (ctx.inFlow) {
    if (valueCommentDone && onComment)
      onComment();
  } else if (valueComment && !valueCommentDone) {
    str += lineComment(str, ctx.indent, commentString(valueComment));
  } else if (chompKeep && onChompKeep) {
    onChompKeep();
  }
  return str;
}

// node_modules/yaml/browser/dist/log.js
function warn(logLevel, warning) {
  if (logLevel === "debug" || logLevel === "warn") {
    console.warn(warning);
  }
}

// node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
var MERGE_KEY = "<<";
var merge = {
  identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
  default: "key",
  tag: "tag:yaml.org,2002:merge",
  test: /^<<$/,
  resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), {
    addToJSMap: addMergeToJSMap
  }),
  stringify: () => MERGE_KEY
};
var isMergeKey = (ctx, key) => (merge.identify(key) || isScalar(key) && (!key.type || key.type === Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
function addMergeToJSMap(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (isSeq(source))
    for (const it of source.items)
      mergeValue(ctx, map2, it);
  else if (Array.isArray(source))
    for (const it of source)
      mergeValue(ctx, map2, it);
  else
    mergeValue(ctx, map2, source);
}
function mergeValue(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (!isMap(source))
    throw new Error("Merge sources must be maps or map aliases");
  const srcMap = source.toJSON(null, ctx, Map);
  for (const [key, value2] of srcMap) {
    if (map2 instanceof Map) {
      if (!map2.has(key))
        map2.set(key, value2);
    } else if (map2 instanceof Set) {
      map2.add(key);
    } else if (!Object.prototype.hasOwnProperty.call(map2, key)) {
      Object.defineProperty(map2, key, {
        value: value2,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }
  return map2;
}
function resolveAliasValue(ctx, value) {
  return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}

// node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
function addPairToJSMap(ctx, map2, { key, value }) {
  if (isNode(key) && key.addToJSMap)
    key.addToJSMap(ctx, map2, value);
  else if (isMergeKey(ctx, key))
    addMergeToJSMap(ctx, map2, value);
  else {
    const jsKey = toJS(key, "", ctx);
    if (map2 instanceof Map) {
      map2.set(jsKey, toJS(value, jsKey, ctx));
    } else if (map2 instanceof Set) {
      map2.add(jsKey);
    } else {
      const stringKey = stringifyKey(key, jsKey, ctx);
      const jsValue = toJS(value, stringKey, ctx);
      if (stringKey in map2)
        Object.defineProperty(map2, stringKey, {
          value: jsValue,
          writable: true,
          enumerable: true,
          configurable: true
        });
      else
        map2[stringKey] = jsValue;
    }
  }
  return map2;
}
function stringifyKey(key, jsKey, ctx) {
  if (jsKey === null)
    return "";
  if (typeof jsKey !== "object")
    return String(jsKey);
  if (isNode(key) && ctx?.doc) {
    const strCtx = createStringifyContext(ctx.doc, {});
    strCtx.anchors = /* @__PURE__ */ new Set();
    for (const node2 of ctx.anchors.keys())
      strCtx.anchors.add(node2.anchor);
    strCtx.inFlow = true;
    strCtx.inStringifyKey = true;
    const strKey = key.toString(strCtx);
    if (!ctx.mapKeyWarned) {
      let jsonStr = JSON.stringify(strKey);
      if (jsonStr.length > 40)
        jsonStr = jsonStr.substring(0, 36) + '..."';
      warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
      ctx.mapKeyWarned = true;
    }
    return strKey;
  }
  return JSON.stringify(jsKey);
}

// node_modules/yaml/browser/dist/nodes/Pair.js
function createPair(key, value, ctx) {
  const k = createNode(key, void 0, ctx);
  const v = createNode(value, void 0, ctx);
  return new Pair(k, v);
}
var Pair = class _Pair {
  constructor(key, value = null) {
    Object.defineProperty(this, NODE_TYPE, { value: PAIR });
    this.key = key;
    this.value = value;
  }
  clone(schema4) {
    let { key, value } = this;
    if (isNode(key))
      key = key.clone(schema4);
    if (isNode(value))
      value = value.clone(schema4);
    return new _Pair(key, value);
  }
  toJSON(_, ctx) {
    const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    return addPairToJSMap(ctx, pair, this);
  }
  toString(ctx, onComment, onChompKeep) {
    return ctx?.doc ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyCollection.js
function stringifyCollection(collection, ctx, options) {
  const flow3 = ctx.inFlow ?? collection.flow;
  const stringify4 = flow3 ? stringifyFlowCollection : stringifyBlockCollection;
  return stringify4(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
  const { indent, options: { commentString } } = ctx;
  const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
  let chompKeep = false;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    let comment2 = null;
    if (isNode(item)) {
      if (!chompKeep && item.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
      if (item.comment)
        comment2 = item.comment;
    } else if (isPair(item)) {
      const ik = isNode(item.key) ? item.key : null;
      if (ik) {
        if (!chompKeep && ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
      }
    }
    chompKeep = false;
    let str2 = stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
    if (comment2)
      str2 += lineComment(str2, itemIndent, commentString(comment2));
    if (chompKeep && comment2)
      chompKeep = false;
    lines.push(blockItemPrefix + str2);
  }
  let str;
  if (lines.length === 0) {
    str = flowChars.start + flowChars.end;
  } else {
    str = lines[0];
    for (let i = 1; i < lines.length; ++i) {
      const line = lines[i];
      str += line ? `
${indent}${line}` : "\n";
    }
  }
  if (comment) {
    str += "\n" + indentComment(commentString(comment), indent);
    if (onComment)
      onComment();
  } else if (chompKeep && onChompKeep)
    onChompKeep();
  return str;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
  const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
  itemIndent += indentStep;
  const itemCtx = Object.assign({}, ctx, {
    indent: itemIndent,
    inFlow: true,
    type: null
  });
  let reqNewline = false;
  let linesAtValue = 0;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    let comment = null;
    if (isNode(item)) {
      if (item.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item.commentBefore, false);
      if (item.comment)
        comment = item.comment;
    } else if (isPair(item)) {
      const ik = isNode(item.key) ? item.key : null;
      if (ik) {
        if (ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, false);
        if (ik.comment)
          reqNewline = true;
      }
      const iv = isNode(item.value) ? item.value : null;
      if (iv) {
        if (iv.comment)
          comment = iv.comment;
        if (iv.commentBefore)
          reqNewline = true;
      } else if (item.value == null && ik?.comment) {
        comment = ik.comment;
      }
    }
    if (comment)
      reqNewline = true;
    let str = stringify(item, itemCtx, () => comment = null);
    reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
    if (i < items.length - 1) {
      str += ",";
    } else if (ctx.options.trailingComma) {
      if (ctx.options.lineWidth > 0) {
        reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
      }
      if (reqNewline) {
        str += ",";
      }
    }
    if (comment)
      str += lineComment(str, itemIndent, commentString(comment));
    lines.push(str);
    linesAtValue = lines.length;
  }
  const { start, end } = flowChars;
  if (lines.length === 0) {
    return start + end;
  } else {
    if (!reqNewline) {
      const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
      reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
    }
    if (reqNewline) {
      let str = start;
      for (const line of lines)
        str += line ? `
${indentStep}${indent}${line}` : "\n";
      return `${str}
${indent}${end}`;
    } else {
      return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
    }
  }
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
  if (comment && chompKeep)
    comment = comment.replace(/^\n+/, "");
  if (comment) {
    const ic = indentComment(commentString(comment), indent);
    lines.push(ic.trimStart());
  }
}

// node_modules/yaml/browser/dist/nodes/YAMLMap.js
function findPair(items, key) {
  const k = isScalar(key) ? key.value : key;
  for (const it of items) {
    if (isPair(it)) {
      if (it.key === key || it.key === k)
        return it;
      if (isScalar(it.key) && it.key.value === k)
        return it;
    }
  }
  return void 0;
}
var YAMLMap = class extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(schema4) {
    super(MAP, schema4);
    this.items = [];
  }
  /**
   * A generic collection parsing method that can be extended
   * to other node classes that inherit from YAMLMap
   */
  static from(schema4, obj, ctx) {
    const { keepUndefined, replacer } = ctx;
    const map2 = new this(schema4);
    const add = (key, value) => {
      if (typeof replacer === "function")
        value = replacer.call(obj, key, value);
      else if (Array.isArray(replacer) && !replacer.includes(key))
        return;
      if (value !== void 0 || keepUndefined)
        map2.items.push(createPair(key, value, ctx));
    };
    if (obj instanceof Map) {
      for (const [key, value] of obj)
        add(key, value);
    } else if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj))
        add(key, obj[key]);
    }
    if (typeof schema4.sortMapEntries === "function") {
      map2.items.sort(schema4.sortMapEntries);
    }
    return map2;
  }
  /**
   * Adds a value to the collection.
   *
   * @param overwrite - If not set `true`, using a key that is already in the
   *   collection will throw. Otherwise, overwrites the previous value.
   */
  add(pair, overwrite) {
    let _pair;
    if (isPair(pair))
      _pair = pair;
    else if (!pair || typeof pair !== "object" || !("key" in pair)) {
      _pair = new Pair(pair, pair?.value);
    } else
      _pair = new Pair(pair.key, pair.value);
    const prev = findPair(this.items, _pair.key);
    const sortEntries = this.schema?.sortMapEntries;
    if (prev) {
      if (!overwrite)
        throw new Error(`Key ${_pair.key} already set`);
      if (isScalar(prev.value) && isScalarValue(_pair.value))
        prev.value.value = _pair.value;
      else
        prev.value = _pair.value;
    } else if (sortEntries) {
      const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
      if (i === -1)
        this.items.push(_pair);
      else
        this.items.splice(i, 0, _pair);
    } else {
      this.items.push(_pair);
    }
  }
  delete(key) {
    const it = findPair(this.items, key);
    if (!it)
      return false;
    const del = this.items.splice(this.items.indexOf(it), 1);
    return del.length > 0;
  }
  get(key, keepScalar) {
    const it = findPair(this.items, key);
    const node2 = it?.value;
    return (!keepScalar && isScalar(node2) ? node2.value : node2) ?? void 0;
  }
  has(key) {
    return !!findPair(this.items, key);
  }
  set(key, value) {
    this.add(new Pair(key, value), true);
  }
  /**
   * @param ctx - Conversion context, originally set in Document#toJS()
   * @param {Class} Type - If set, forces the returned collection type
   * @returns Instance of Type, Map, or Object
   */
  toJSON(_, ctx, Type) {
    const map2 = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    if (ctx?.onCreate)
      ctx.onCreate(map2);
    for (const item of this.items)
      addPairToJSMap(ctx, map2, item);
    return map2;
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    for (const item of this.items) {
      if (!isPair(item))
        throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
    }
    if (!ctx.allNullValues && this.hasAllNullValues(false))
      ctx = Object.assign({}, ctx, { allNullValues: true });
    return stringifyCollection(this, ctx, {
      blockItemPrefix: "",
      flowChars: { start: "{", end: "}" },
      itemIndent: ctx.indent || "",
      onChompKeep,
      onComment
    });
  }
};

// node_modules/yaml/browser/dist/schema/common/map.js
var map = {
  collection: "map",
  default: true,
  nodeClass: YAMLMap,
  tag: "tag:yaml.org,2002:map",
  resolve(map2, onError) {
    if (!isMap(map2))
      onError("Expected a mapping for this tag");
    return map2;
  },
  createNode: (schema4, obj, ctx) => YAMLMap.from(schema4, obj, ctx)
};

// node_modules/yaml/browser/dist/nodes/YAMLSeq.js
var YAMLSeq = class extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(schema4) {
    super(SEQ, schema4);
    this.items = [];
  }
  add(value) {
    this.items.push(value);
  }
  /**
   * Removes a value from the collection.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   *
   * @returns `true` if the item was found and removed.
   */
  delete(key) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      return false;
    const del = this.items.splice(idx, 1);
    return del.length > 0;
  }
  get(key, keepScalar) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      return void 0;
    const it = this.items[idx];
    return !keepScalar && isScalar(it) ? it.value : it;
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   */
  has(key) {
    const idx = asItemIndex(key);
    return typeof idx === "number" && idx < this.items.length;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   *
   * If `key` does not contain a representation of an integer, this will throw.
   * It may be wrapped in a `Scalar`.
   */
  set(key, value) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      throw new Error(`Expected a valid index, not ${key}.`);
    const prev = this.items[idx];
    if (isScalar(prev) && isScalarValue(value))
      prev.value = value;
    else
      this.items[idx] = value;
  }
  toJSON(_, ctx) {
    const seq2 = [];
    if (ctx?.onCreate)
      ctx.onCreate(seq2);
    let i = 0;
    for (const item of this.items)
      seq2.push(toJS(item, String(i++), ctx));
    return seq2;
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    return stringifyCollection(this, ctx, {
      blockItemPrefix: "- ",
      flowChars: { start: "[", end: "]" },
      itemIndent: (ctx.indent || "") + "  ",
      onChompKeep,
      onComment
    });
  }
  static from(schema4, obj, ctx) {
    const { replacer } = ctx;
    const seq2 = new this(schema4);
    if (obj && Symbol.iterator in Object(obj)) {
      let i = 0;
      for (let it of obj) {
        if (typeof replacer === "function") {
          const key = obj instanceof Set ? it : String(i++);
          it = replacer.call(obj, key, it);
        }
        seq2.items.push(createNode(it, void 0, ctx));
      }
    }
    return seq2;
  }
};
function asItemIndex(key) {
  let idx = isScalar(key) ? key.value : key;
  if (idx && typeof idx === "string")
    idx = Number(idx);
  return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
}

// node_modules/yaml/browser/dist/schema/common/seq.js
var seq = {
  collection: "seq",
  default: true,
  nodeClass: YAMLSeq,
  tag: "tag:yaml.org,2002:seq",
  resolve(seq2, onError) {
    if (!isSeq(seq2))
      onError("Expected a sequence for this tag");
    return seq2;
  },
  createNode: (schema4, obj, ctx) => YAMLSeq.from(schema4, obj, ctx)
};

// node_modules/yaml/browser/dist/schema/common/string.js
var string = {
  identify: (value) => typeof value === "string",
  default: true,
  tag: "tag:yaml.org,2002:str",
  resolve: (str) => str,
  stringify(item, ctx, onComment, onChompKeep) {
    ctx = Object.assign({ actualString: true }, ctx);
    return stringifyString(item, ctx, onComment, onChompKeep);
  }
};

// node_modules/yaml/browser/dist/schema/common/null.js
var nullTag = {
  identify: (value) => value == null,
  createNode: () => new Scalar(null),
  default: true,
  tag: "tag:yaml.org,2002:null",
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: () => new Scalar(null),
  stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
};

// node_modules/yaml/browser/dist/schema/core/bool.js
var boolTag = {
  identify: (value) => typeof value === "boolean",
  default: true,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: (str) => new Scalar(str[0] === "t" || str[0] === "T"),
  stringify({ source, value }, ctx) {
    if (source && boolTag.test.test(source)) {
      const sv = source[0] === "t" || source[0] === "T";
      if (value === sv)
        return source;
    }
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyNumber.js
function stringifyNumber({ format, minFractionDigits, tag, value }) {
  if (typeof value === "bigint")
    return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (!isFinite(num))
    return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
  let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
  if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
    let i = n.indexOf(".");
    if (i < 0) {
      i = n.length;
      n += ".";
    }
    let d = minFractionDigits - (n.length - i - 1);
    while (d-- > 0)
      n += "0";
  }
  return n;
}

// node_modules/yaml/browser/dist/schema/core/float.js
var floatNaN = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: stringifyNumber
};
var floatExp = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: (str) => parseFloat(str),
  stringify(node2) {
    const num = Number(node2.value);
    return isFinite(num) ? num.toExponential() : stringifyNumber(node2);
  }
};
var float = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
  resolve(str) {
    const node2 = new Scalar(parseFloat(str));
    const dot = str.indexOf(".");
    if (dot !== -1 && str[str.length - 1] === "0")
      node2.minFractionDigits = str.length - dot - 1;
    return node2;
  },
  stringify: stringifyNumber
};

// node_modules/yaml/browser/dist/schema/core/int.js
var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
function intStringify(node2, radix, prefix) {
  const { value } = node2;
  if (intIdentify(value) && value >= 0)
    return prefix + value.toString(radix);
  return stringifyNumber(node2);
}
var intOct = {
  identify: (value) => intIdentify(value) && value >= 0,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^0o[0-7]+$/,
  resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
  stringify: (node2) => intStringify(node2, 8, "0o")
};
var int = {
  identify: intIdentify,
  default: true,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9]+$/,
  resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
  stringify: stringifyNumber
};
var intHex = {
  identify: (value) => intIdentify(value) && value >= 0,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^0x[0-9a-fA-F]+$/,
  resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
  stringify: (node2) => intStringify(node2, 16, "0x")
};

// node_modules/yaml/browser/dist/schema/core/schema.js
var schema = [
  map,
  seq,
  string,
  nullTag,
  boolTag,
  intOct,
  int,
  intHex,
  floatNaN,
  floatExp,
  float
];

// node_modules/yaml/browser/dist/schema/json/schema.js
function intIdentify2(value) {
  return typeof value === "bigint" || Number.isInteger(value);
}
var stringifyJSON = ({ value }) => JSON.stringify(value);
var jsonScalars = [
  {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify: stringifyJSON
  },
  {
    identify: (value) => value == null,
    createNode: () => new Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^null$/,
    resolve: () => null,
    stringify: stringifyJSON
  },
  {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^true$|^false$/,
    resolve: (str) => str === "true",
    stringify: stringifyJSON
  },
  {
    identify: intIdentify2,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^-?(?:0|[1-9][0-9]*)$/,
    resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
    stringify: ({ value }) => intIdentify2(value) ? value.toString() : JSON.stringify(value)
  },
  {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
    resolve: (str) => parseFloat(str),
    stringify: stringifyJSON
  }
];
var jsonError = {
  default: true,
  tag: "",
  test: /^/,
  resolve(str, onError) {
    onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
    return str;
  }
};
var schema2 = [map, seq].concat(jsonScalars, jsonError);

// node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js
var binary = {
  identify: (value) => value instanceof Uint8Array,
  // Buffer inherits from Uint8Array
  default: false,
  tag: "tag:yaml.org,2002:binary",
  /**
   * Returns a Buffer in node and an Uint8Array in browsers
   *
   * To use the resulting buffer as an image, you'll want to do something like:
   *
   *   const blob = new Blob([buffer], { type: 'image/jpeg' })
   *   document.querySelector('#photo').src = URL.createObjectURL(blob)
   */
  resolve(src, onError) {
    if (typeof atob === "function") {
      const str = atob(src.replace(/[\n\r]/g, ""));
      const buffer = new Uint8Array(str.length);
      for (let i = 0; i < str.length; ++i)
        buffer[i] = str.charCodeAt(i);
      return buffer;
    } else {
      onError("This environment does not support reading binary tags; either Buffer or atob is required");
      return src;
    }
  },
  stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
    if (!value)
      return "";
    const buf = value;
    let str;
    if (typeof btoa === "function") {
      let s = "";
      for (let i = 0; i < buf.length; ++i)
        s += String.fromCharCode(buf[i]);
      str = btoa(s);
    } else {
      throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
    }
    type ?? (type = Scalar.BLOCK_LITERAL);
    if (type !== Scalar.QUOTE_DOUBLE) {
      const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
      const n = Math.ceil(str.length / lineWidth);
      const lines = new Array(n);
      for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
        lines[i] = str.substr(o, lineWidth);
      }
      str = lines.join(type === Scalar.BLOCK_LITERAL ? "\n" : " ");
    }
    return stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
  }
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
function resolvePairs(seq2, onError) {
  if (isSeq(seq2)) {
    for (let i = 0; i < seq2.items.length; ++i) {
      let item = seq2.items[i];
      if (isPair(item))
        continue;
      else if (isMap(item)) {
        if (item.items.length > 1)
          onError("Each pair must have its own sequence indicator");
        const pair = item.items[0] || new Pair(new Scalar(null));
        if (item.commentBefore)
          pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
        if (item.comment) {
          const cn = pair.value ?? pair.key;
          cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
        }
        item = pair;
      }
      seq2.items[i] = isPair(item) ? item : new Pair(item);
    }
  } else
    onError("Expected a sequence for this tag");
  return seq2;
}
function createPairs(schema4, iterable, ctx) {
  const { replacer } = ctx;
  const pairs2 = new YAMLSeq(schema4);
  pairs2.tag = "tag:yaml.org,2002:pairs";
  let i = 0;
  if (iterable && Symbol.iterator in Object(iterable))
    for (let it of iterable) {
      if (typeof replacer === "function")
        it = replacer.call(iterable, String(i++), it);
      let key, value;
      if (Array.isArray(it)) {
        if (it.length === 2) {
          key = it[0];
          value = it[1];
        } else
          throw new TypeError(`Expected [key, value] tuple: ${it}`);
      } else if (it && it instanceof Object) {
        const keys = Object.keys(it);
        if (keys.length === 1) {
          key = keys[0];
          value = it[key];
        } else {
          throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
        }
      } else {
        key = it;
      }
      pairs2.items.push(createPair(key, value, ctx));
    }
  return pairs2;
}
var pairs = {
  collection: "seq",
  default: false,
  tag: "tag:yaml.org,2002:pairs",
  resolve: resolvePairs,
  createNode: createPairs
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
var YAMLOMap = class _YAMLOMap extends YAMLSeq {
  constructor() {
    super();
    this.add = YAMLMap.prototype.add.bind(this);
    this.delete = YAMLMap.prototype.delete.bind(this);
    this.get = YAMLMap.prototype.get.bind(this);
    this.has = YAMLMap.prototype.has.bind(this);
    this.set = YAMLMap.prototype.set.bind(this);
    this.tag = _YAMLOMap.tag;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */
  toJSON(_, ctx) {
    if (!ctx)
      return super.toJSON(_);
    const map2 = /* @__PURE__ */ new Map();
    if (ctx?.onCreate)
      ctx.onCreate(map2);
    for (const pair of this.items) {
      let key, value;
      if (isPair(pair)) {
        key = toJS(pair.key, "", ctx);
        value = toJS(pair.value, key, ctx);
      } else {
        key = toJS(pair, "", ctx);
      }
      if (map2.has(key))
        throw new Error("Ordered maps must not include duplicate keys");
      map2.set(key, value);
    }
    return map2;
  }
  static from(schema4, iterable, ctx) {
    const pairs2 = createPairs(schema4, iterable, ctx);
    const omap2 = new this();
    omap2.items = pairs2.items;
    return omap2;
  }
};
YAMLOMap.tag = "tag:yaml.org,2002:omap";
var omap = {
  collection: "seq",
  identify: (value) => value instanceof Map,
  nodeClass: YAMLOMap,
  default: false,
  tag: "tag:yaml.org,2002:omap",
  resolve(seq2, onError) {
    const pairs2 = resolvePairs(seq2, onError);
    const seenKeys = [];
    for (const { key } of pairs2.items) {
      if (isScalar(key)) {
        if (seenKeys.includes(key.value)) {
          onError(`Ordered maps must not include duplicate keys: ${key.value}`);
        } else {
          seenKeys.push(key.value);
        }
      }
    }
    return Object.assign(new YAMLOMap(), pairs2);
  },
  createNode: (schema4, iterable, ctx) => YAMLOMap.from(schema4, iterable, ctx)
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js
function boolStringify({ value, source }, ctx) {
  const boolObj = value ? trueTag : falseTag;
  if (source && boolObj.test.test(source))
    return source;
  return value ? ctx.options.trueStr : ctx.options.falseStr;
}
var trueTag = {
  identify: (value) => value === true,
  default: true,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: () => new Scalar(true),
  stringify: boolStringify
};
var falseTag = {
  identify: (value) => value === false,
  default: true,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
  resolve: () => new Scalar(false),
  stringify: boolStringify
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/float.js
var floatNaN2 = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: stringifyNumber
};
var floatExp2 = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: (str) => parseFloat(str.replace(/_/g, "")),
  stringify(node2) {
    const num = Number(node2.value);
    return isFinite(num) ? num.toExponential() : stringifyNumber(node2);
  }
};
var float2 = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
  resolve(str) {
    const node2 = new Scalar(parseFloat(str.replace(/_/g, "")));
    const dot = str.indexOf(".");
    if (dot !== -1) {
      const f = str.substring(dot + 1).replace(/_/g, "");
      if (f[f.length - 1] === "0")
        node2.minFractionDigits = f.length;
    }
    return node2;
  },
  stringify: stringifyNumber
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/int.js
var intIdentify3 = (value) => typeof value === "bigint" || Number.isInteger(value);
function intResolve2(str, offset, radix, { intAsBigInt }) {
  const sign = str[0];
  if (sign === "-" || sign === "+")
    offset += 1;
  str = str.substring(offset).replace(/_/g, "");
  if (intAsBigInt) {
    switch (radix) {
      case 2:
        str = `0b${str}`;
        break;
      case 8:
        str = `0o${str}`;
        break;
      case 16:
        str = `0x${str}`;
        break;
    }
    const n2 = BigInt(str);
    return sign === "-" ? BigInt(-1) * n2 : n2;
  }
  const n = parseInt(str, radix);
  return sign === "-" ? -1 * n : n;
}
function intStringify2(node2, radix, prefix) {
  const { value } = node2;
  if (intIdentify3(value)) {
    const str = value.toString(radix);
    return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
  }
  return stringifyNumber(node2);
}
var intBin = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "BIN",
  test: /^[-+]?0b[0-1_]+$/,
  resolve: (str, _onError, opt) => intResolve2(str, 2, 2, opt),
  stringify: (node2) => intStringify2(node2, 2, "0b")
};
var intOct2 = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^[-+]?0[0-7_]+$/,
  resolve: (str, _onError, opt) => intResolve2(str, 1, 8, opt),
  stringify: (node2) => intStringify2(node2, 8, "0")
};
var int2 = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9][0-9_]*$/,
  resolve: (str, _onError, opt) => intResolve2(str, 0, 10, opt),
  stringify: stringifyNumber
};
var intHex2 = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^[-+]?0x[0-9a-fA-F_]+$/,
  resolve: (str, _onError, opt) => intResolve2(str, 2, 16, opt),
  stringify: (node2) => intStringify2(node2, 16, "0x")
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
var YAMLSet = class _YAMLSet extends YAMLMap {
  constructor(schema4) {
    super(schema4);
    this.tag = _YAMLSet.tag;
  }
  add(key) {
    let pair;
    if (isPair(key))
      pair = key;
    else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
      pair = new Pair(key.key, null);
    else
      pair = new Pair(key, null);
    const prev = findPair(this.items, pair.key);
    if (!prev)
      this.items.push(pair);
  }
  /**
   * If `keepPair` is `true`, returns the Pair matching `key`.
   * Otherwise, returns the value of that Pair's key.
   */
  get(key, keepPair) {
    const pair = findPair(this.items, key);
    return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
  }
  set(key, value) {
    if (typeof value !== "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
    const prev = findPair(this.items, key);
    if (prev && !value) {
      this.items.splice(this.items.indexOf(prev), 1);
    } else if (!prev && value) {
      this.items.push(new Pair(key));
    }
  }
  toJSON(_, ctx) {
    return super.toJSON(_, ctx, Set);
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    if (this.hasAllNullValues(true))
      return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
    else
      throw new Error("Set items must all have null values");
  }
  static from(schema4, iterable, ctx) {
    const { replacer } = ctx;
    const set2 = new this(schema4);
    if (iterable && Symbol.iterator in Object(iterable))
      for (let value of iterable) {
        if (typeof replacer === "function")
          value = replacer.call(iterable, value, value);
        set2.items.push(createPair(value, null, ctx));
      }
    return set2;
  }
};
YAMLSet.tag = "tag:yaml.org,2002:set";
var set = {
  collection: "map",
  identify: (value) => value instanceof Set,
  nodeClass: YAMLSet,
  default: false,
  tag: "tag:yaml.org,2002:set",
  createNode: (schema4, iterable, ctx) => YAMLSet.from(schema4, iterable, ctx),
  resolve(map2, onError) {
    if (isMap(map2)) {
      if (map2.hasAllNullValues(true))
        return Object.assign(new YAMLSet(), map2);
      else
        onError("Set items must all have null values");
    } else
      onError("Expected a mapping for this tag");
    return map2;
  }
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
function parseSexagesimal(str, asBigInt) {
  const sign = str[0];
  const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
  const num = (n) => asBigInt ? BigInt(n) : Number(n);
  const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
  return sign === "-" ? num(-1) * res : res;
}
function stringifySexagesimal(node2) {
  let { value } = node2;
  let num = (n) => n;
  if (typeof value === "bigint")
    num = (n) => BigInt(n);
  else if (isNaN(value) || !isFinite(value))
    return stringifyNumber(node2);
  let sign = "";
  if (value < 0) {
    sign = "-";
    value *= num(-1);
  }
  const _60 = num(60);
  const parts = [value % _60];
  if (value < 60) {
    parts.unshift(0);
  } else {
    value = (value - parts[0]) / _60;
    parts.unshift(value % _60);
    if (value >= 60) {
      value = (value - parts[0]) / _60;
      parts.unshift(value);
    }
  }
  return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
var intTime = {
  identify: (value) => typeof value === "bigint" || Number.isInteger(value),
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
  resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
  stringify: stringifySexagesimal
};
var floatTime = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
  resolve: (str) => parseSexagesimal(str, false),
  stringify: stringifySexagesimal
};
var timestamp = {
  identify: (value) => value instanceof Date,
  default: true,
  tag: "tag:yaml.org,2002:timestamp",
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
  resolve(str) {
    const match = str.match(timestamp.test);
    if (!match)
      throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
    const [, year, month, day, hour, minute, second] = match.map(Number);
    const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
    let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
    const tz = match[8];
    if (tz && tz !== "Z") {
      let d = parseSexagesimal(tz, false);
      if (Math.abs(d) < 30)
        d *= 60;
      date -= 6e4 * d;
    }
    return new Date(date);
  },
  stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js
var schema3 = [
  map,
  seq,
  string,
  nullTag,
  trueTag,
  falseTag,
  intBin,
  intOct2,
  int2,
  intHex2,
  floatNaN2,
  floatExp2,
  float2,
  binary,
  merge,
  omap,
  pairs,
  set,
  intTime,
  floatTime,
  timestamp
];

// node_modules/yaml/browser/dist/schema/tags.js
var schemas = /* @__PURE__ */ new Map([
  ["core", schema],
  ["failsafe", [map, seq, string]],
  ["json", schema2],
  ["yaml11", schema3],
  ["yaml-1.1", schema3]
]);
var tagsByName = {
  binary,
  bool: boolTag,
  float,
  floatExp,
  floatNaN,
  floatTime,
  int,
  intHex,
  intOct,
  intTime,
  map,
  merge,
  null: nullTag,
  omap,
  pairs,
  seq,
  set,
  timestamp
};
var coreKnownTags = {
  "tag:yaml.org,2002:binary": binary,
  "tag:yaml.org,2002:merge": merge,
  "tag:yaml.org,2002:omap": omap,
  "tag:yaml.org,2002:pairs": pairs,
  "tag:yaml.org,2002:set": set,
  "tag:yaml.org,2002:timestamp": timestamp
};
function getTags(customTags, schemaName, addMergeTag) {
  const schemaTags = schemas.get(schemaName);
  if (schemaTags && !customTags) {
    return addMergeTag && !schemaTags.includes(merge) ? schemaTags.concat(merge) : schemaTags.slice();
  }
  let tags = schemaTags;
  if (!tags) {
    if (Array.isArray(customTags))
      tags = [];
    else {
      const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
      throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
    }
  }
  if (Array.isArray(customTags)) {
    for (const tag of customTags)
      tags = tags.concat(tag);
  } else if (typeof customTags === "function") {
    tags = customTags(tags.slice());
  }
  if (addMergeTag)
    tags = tags.concat(merge);
  return tags.reduce((tags2, tag) => {
    const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
    if (!tagObj) {
      const tagName = JSON.stringify(tag);
      const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
      throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
    }
    if (!tags2.includes(tagObj))
      tags2.push(tagObj);
    return tags2;
  }, []);
}

// node_modules/yaml/browser/dist/schema/Schema.js
var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
var Schema = class _Schema {
  constructor({ compat, customTags, merge: merge2, resolveKnownTags, schema: schema4, sortMapEntries, toStringDefaults }) {
    this.compat = Array.isArray(compat) ? getTags(compat, "compat") : compat ? getTags(null, compat) : null;
    this.name = typeof schema4 === "string" && schema4 || "core";
    this.knownTags = resolveKnownTags ? coreKnownTags : {};
    this.tags = getTags(customTags, this.name, merge2);
    this.toStringOptions = toStringDefaults ?? null;
    Object.defineProperty(this, MAP, { value: map });
    Object.defineProperty(this, SCALAR, { value: string });
    Object.defineProperty(this, SEQ, { value: seq });
    this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
  }
  clone() {
    const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
    copy.tags = this.tags.slice();
    return copy;
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyDocument.js
function stringifyDocument(doc, options) {
  const lines = [];
  let hasDirectives = options.directives === true;
  if (options.directives !== false && doc.directives) {
    const dir = doc.directives.toString(doc);
    if (dir) {
      lines.push(dir);
      hasDirectives = true;
    } else if (doc.directives.docStart)
      hasDirectives = true;
  }
  if (hasDirectives)
    lines.push("---");
  const ctx = createStringifyContext(doc, options);
  const { commentString } = ctx.options;
  if (doc.commentBefore) {
    if (lines.length !== 1)
      lines.unshift("");
    const cs = commentString(doc.commentBefore);
    lines.unshift(indentComment(cs, ""));
  }
  let chompKeep = false;
  let contentComment = null;
  if (doc.contents) {
    if (isNode(doc.contents)) {
      if (doc.contents.spaceBefore && hasDirectives)
        lines.push("");
      if (doc.contents.commentBefore) {
        const cs = commentString(doc.contents.commentBefore);
        lines.push(indentComment(cs, ""));
      }
      ctx.forceBlockIndent = !!doc.comment;
      contentComment = doc.contents.comment;
    }
    const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
    let body = stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
    if (contentComment)
      body += lineComment(body, "", commentString(contentComment));
    if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
      lines[lines.length - 1] = `--- ${body}`;
    } else
      lines.push(body);
  } else {
    lines.push(stringify(doc.contents, ctx));
  }
  if (doc.directives?.docEnd) {
    if (doc.comment) {
      const cs = commentString(doc.comment);
      if (cs.includes("\n")) {
        lines.push("...");
        lines.push(indentComment(cs, ""));
      } else {
        lines.push(`... ${cs}`);
      }
    } else {
      lines.push("...");
    }
  } else {
    let dc = doc.comment;
    if (dc && chompKeep)
      dc = dc.replace(/^\n+/, "");
    if (dc) {
      if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
        lines.push("");
      lines.push(indentComment(commentString(dc), ""));
    }
  }
  return lines.join("\n") + "\n";
}

// node_modules/yaml/browser/dist/doc/Document.js
var Document = class _Document {
  constructor(value, replacer, options) {
    this.commentBefore = null;
    this.comment = null;
    this.errors = [];
    this.warnings = [];
    Object.defineProperty(this, NODE_TYPE, { value: DOC });
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === void 0 && replacer) {
      options = replacer;
      replacer = void 0;
    }
    const opt = Object.assign({
      intAsBigInt: false,
      keepSourceTokens: false,
      logLevel: "warn",
      prettyErrors: true,
      strict: true,
      stringKeys: false,
      uniqueKeys: true,
      version: "1.2"
    }, options);
    this.options = opt;
    let { version } = opt;
    if (options?._directives) {
      this.directives = options._directives.atDocument();
      if (this.directives.yaml.explicit)
        version = this.directives.yaml.version;
    } else
      this.directives = new Directives({ version });
    this.setSchema(version, options);
    this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
  }
  /**
   * Create a deep copy of this Document and its contents.
   *
   * Custom Node values that inherit from `Object` still refer to their original instances.
   */
  clone() {
    const copy = Object.create(_Document.prototype, {
      [NODE_TYPE]: { value: DOC }
    });
    copy.commentBefore = this.commentBefore;
    copy.comment = this.comment;
    copy.errors = this.errors.slice();
    copy.warnings = this.warnings.slice();
    copy.options = Object.assign({}, this.options);
    if (this.directives)
      copy.directives = this.directives.clone();
    copy.schema = this.schema.clone();
    copy.contents = isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /** Adds a value to the document. */
  add(value) {
    if (assertCollection(this.contents))
      this.contents.add(value);
  }
  /** Adds a value to the document. */
  addIn(path, value) {
    if (assertCollection(this.contents))
      this.contents.addIn(path, value);
  }
  /**
   * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
   *
   * If `node` already has an anchor, `name` is ignored.
   * Otherwise, the `node.anchor` value will be set to `name`,
   * or if an anchor with that name is already present in the document,
   * `name` will be used as a prefix for a new unique anchor.
   * If `name` is undefined, the generated anchor will use 'a' as a prefix.
   */
  createAlias(node2, name) {
    if (!node2.anchor) {
      const prev = anchorNames(this);
      node2.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      !name || prev.has(name) ? findNewAnchor(name || "a", prev) : name;
    }
    return new Alias(node2.anchor);
  }
  createNode(value, replacer, options) {
    let _replacer = void 0;
    if (typeof replacer === "function") {
      value = replacer.call({ "": value }, "", value);
      _replacer = replacer;
    } else if (Array.isArray(replacer)) {
      const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
      const asStr = replacer.filter(keyToStr).map(String);
      if (asStr.length > 0)
        replacer = replacer.concat(asStr);
      _replacer = replacer;
    } else if (options === void 0 && replacer) {
      options = replacer;
      replacer = void 0;
    }
    const { aliasDuplicateObjects, anchorPrefix, flow: flow3, keepUndefined, onTagObj, tag } = options ?? {};
    const { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(
      this,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      anchorPrefix || "a"
    );
    const ctx = {
      aliasDuplicateObjects: aliasDuplicateObjects ?? true,
      keepUndefined: keepUndefined ?? false,
      onAnchor,
      onTagObj,
      replacer: _replacer,
      schema: this.schema,
      sourceObjects
    };
    const node2 = createNode(value, tag, ctx);
    if (flow3 && isCollection(node2))
      node2.flow = true;
    setAnchors();
    return node2;
  }
  /**
   * Convert a key and a value into a `Pair` using the current schema,
   * recursively wrapping all values as `Scalar` or `Collection` nodes.
   */
  createPair(key, value, options = {}) {
    const k = this.createNode(key, null, options);
    const v = this.createNode(value, null, options);
    return new Pair(k, v);
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  delete(key) {
    return assertCollection(this.contents) ? this.contents.delete(key) : false;
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(path) {
    if (isEmptyPath(path)) {
      if (this.contents == null)
        return false;
      this.contents = null;
      return true;
    }
    return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  get(key, keepScalar) {
    return isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
  }
  /**
   * Returns item at `path`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(path, keepScalar) {
    if (isEmptyPath(path))
      return !keepScalar && isScalar(this.contents) ? this.contents.value : this.contents;
    return isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
  }
  /**
   * Checks if the document includes a value with the key `key`.
   */
  has(key) {
    return isCollection(this.contents) ? this.contents.has(key) : false;
  }
  /**
   * Checks if the document includes a value at `path`.
   */
  hasIn(path) {
    if (isEmptyPath(path))
      return this.contents !== void 0;
    return isCollection(this.contents) ? this.contents.hasIn(path) : false;
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  set(key, value) {
    if (this.contents == null) {
      this.contents = collectionFromPath(this.schema, [key], value);
    } else if (assertCollection(this.contents)) {
      this.contents.set(key, value);
    }
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(path, value) {
    if (isEmptyPath(path)) {
      this.contents = value;
    } else if (this.contents == null) {
      this.contents = collectionFromPath(this.schema, Array.from(path), value);
    } else if (assertCollection(this.contents)) {
      this.contents.setIn(path, value);
    }
  }
  /**
   * Change the YAML version and schema used by the document.
   * A `null` version disables support for directives, explicit tags, anchors, and aliases.
   * It also requires the `schema` option to be given as a `Schema` instance value.
   *
   * Overrides all previously set schema options.
   */
  setSchema(version, options = {}) {
    if (typeof version === "number")
      version = String(version);
    let opt;
    switch (version) {
      case "1.1":
        if (this.directives)
          this.directives.yaml.version = "1.1";
        else
          this.directives = new Directives({ version: "1.1" });
        opt = { resolveKnownTags: false, schema: "yaml-1.1" };
        break;
      case "1.2":
      case "next":
        if (this.directives)
          this.directives.yaml.version = version;
        else
          this.directives = new Directives({ version });
        opt = { resolveKnownTags: true, schema: "core" };
        break;
      case null:
        if (this.directives)
          delete this.directives;
        opt = null;
        break;
      default: {
        const sv = JSON.stringify(version);
        throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
      }
    }
    if (options.schema instanceof Object)
      this.schema = options.schema;
    else if (opt)
      this.schema = new Schema(Object.assign(opt, options));
    else
      throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
  }
  // json & jsonArg are only used from toJSON()
  toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
    const ctx = {
      anchors: /* @__PURE__ */ new Map(),
      doc: this,
      keep: !json,
      mapAsMap: mapAsMap === true,
      mapKeyWarned: false,
      maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
    };
    const res = toJS(this.contents, jsonArg ?? "", ctx);
    if (typeof onAnchor === "function")
      for (const { count, res: res2 } of ctx.anchors.values())
        onAnchor(res2, count);
    return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
  }
  /**
   * A JSON representation of the document `contents`.
   *
   * @param jsonArg Used by `JSON.stringify` to indicate the array index or
   *   property name.
   */
  toJSON(jsonArg, onAnchor) {
    return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
  }
  /** A YAML representation of the document. */
  toString(options = {}) {
    if (this.errors.length > 0)
      throw new Error("Document with errors cannot be stringified");
    if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
      const s = JSON.stringify(options.indent);
      throw new Error(`"indent" option must be a positive integer, not ${s}`);
    }
    return stringifyDocument(this, options);
  }
};
function assertCollection(contents) {
  if (isCollection(contents))
    return true;
  throw new Error("Expected a YAML collection as document contents");
}

// node_modules/yaml/browser/dist/errors.js
var YAMLError = class extends Error {
  constructor(name, pos, code, message) {
    super();
    this.name = name;
    this.code = code;
    this.message = message;
    this.pos = pos;
  }
};
var YAMLParseError = class extends YAMLError {
  constructor(pos, code, message) {
    super("YAMLParseError", pos, code, message);
  }
};
var YAMLWarning = class extends YAMLError {
  constructor(pos, code, message) {
    super("YAMLWarning", pos, code, message);
  }
};
var prettifyError = (src, lc) => (error) => {
  if (error.pos[0] === -1)
    return;
  error.linePos = error.pos.map((pos) => lc.linePos(pos));
  const { line, col } = error.linePos[0];
  error.message += ` at line ${line}, column ${col}`;
  let ci = col - 1;
  let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
  if (ci >= 60 && lineStr.length > 80) {
    const trimStart = Math.min(ci - 39, lineStr.length - 79);
    lineStr = "\u2026" + lineStr.substring(trimStart);
    ci -= trimStart - 1;
  }
  if (lineStr.length > 80)
    lineStr = lineStr.substring(0, 79) + "\u2026";
  if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
    let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
    if (prev.length > 80)
      prev = prev.substring(0, 79) + "\u2026\n";
    lineStr = prev + lineStr;
  }
  if (/[^ ]/.test(lineStr)) {
    let count = 1;
    const end = error.linePos[1];
    if (end?.line === line && end.col > col) {
      count = Math.max(1, Math.min(end.col - col, 80 - ci));
    }
    const pointer = " ".repeat(ci) + "^".repeat(count);
    error.message += `:

${lineStr}
${pointer}
`;
  }
};

// node_modules/yaml/browser/dist/compose/resolve-props.js
function resolveProps(tokens, { flow: flow3, indicator, next, offset, onError, parentIndent, startOnNewline }) {
  let spaceBefore = false;
  let atNewline = startOnNewline;
  let hasSpace = startOnNewline;
  let comment = "";
  let commentSep = "";
  let hasNewline = false;
  let reqSpace = false;
  let tab = null;
  let anchor = null;
  let tag = null;
  let newlineAfterProp = null;
  let comma = null;
  let found = null;
  let start = null;
  for (const token of tokens) {
    if (reqSpace) {
      if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
        onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      reqSpace = false;
    }
    if (tab) {
      if (atNewline && token.type !== "comment" && token.type !== "newline") {
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      }
      tab = null;
    }
    switch (token.type) {
      case "space":
        if (!flow3 && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
          tab = token;
        }
        hasSpace = true;
        break;
      case "comment": {
        if (!hasSpace)
          onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
        const cb = token.source.substring(1) || " ";
        if (!comment)
          comment = cb;
        else
          comment += commentSep + cb;
        commentSep = "";
        atNewline = false;
        break;
      }
      case "newline":
        if (atNewline) {
          if (comment)
            comment += token.source;
          else if (!found || indicator !== "seq-item-ind")
            spaceBefore = true;
        } else
          commentSep += token.source;
        atNewline = true;
        hasNewline = true;
        if (anchor || tag)
          newlineAfterProp = token;
        hasSpace = true;
        break;
      case "anchor":
        if (anchor)
          onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
        if (token.source.endsWith(":"))
          onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
        anchor = token;
        start ?? (start = token.offset);
        atNewline = false;
        hasSpace = false;
        reqSpace = true;
        break;
      case "tag": {
        if (tag)
          onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
        tag = token;
        start ?? (start = token.offset);
        atNewline = false;
        hasSpace = false;
        reqSpace = true;
        break;
      }
      case indicator:
        if (anchor || tag)
          onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
        if (found)
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow3 ?? "collection"}`);
        found = token;
        atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
        hasSpace = false;
        break;
      case "comma":
        if (flow3) {
          if (comma)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow3}`);
          comma = token;
          atNewline = false;
          hasSpace = false;
          break;
        }
      // else fallthrough
      default:
        onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
        atNewline = false;
        hasSpace = false;
    }
  }
  const last = tokens[tokens.length - 1];
  const end = last ? last.offset + last.source.length : offset;
  if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
    onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
  }
  if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
    onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
  return {
    comma,
    found,
    spaceBefore,
    comment,
    hasNewline,
    anchor,
    tag,
    newlineAfterProp,
    end,
    start: start ?? end
  };
}

// node_modules/yaml/browser/dist/compose/util-contains-newline.js
function containsNewline(key) {
  if (!key)
    return null;
  switch (key.type) {
    case "alias":
    case "scalar":
    case "double-quoted-scalar":
    case "single-quoted-scalar":
      if (key.source.includes("\n"))
        return true;
      if (key.end) {
        for (const st of key.end)
          if (st.type === "newline")
            return true;
      }
      return false;
    case "flow-collection":
      for (const it of key.items) {
        for (const st of it.start)
          if (st.type === "newline")
            return true;
        if (it.sep) {
          for (const st of it.sep)
            if (st.type === "newline")
              return true;
        }
        if (containsNewline(it.key) || containsNewline(it.value))
          return true;
      }
      return false;
    default:
      return true;
  }
}

// node_modules/yaml/browser/dist/compose/util-flow-indent-check.js
function flowIndentCheck(indent, fc, onError) {
  if (fc?.type === "flow-collection") {
    const end = fc.end[0];
    if (end.indent === indent && (end.source === "]" || end.source === "}") && containsNewline(fc)) {
      const msg = "Flow end indicator should be more indented than parent";
      onError(end, "BAD_INDENT", msg, true);
    }
  }
}

// node_modules/yaml/browser/dist/compose/util-map-includes.js
function mapIncludes(ctx, items, search2) {
  const { uniqueKeys } = ctx.options;
  if (uniqueKeys === false)
    return false;
  const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || isScalar(a) && isScalar(b) && a.value === b.value;
  return items.some((pair) => isEqual(pair.key, search2));
}

// node_modules/yaml/browser/dist/compose/resolve-block-map.js
var startColMsg = "All mapping items must start at the same column";
function resolveBlockMap({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bm, onError, tag) {
  const NodeClass = tag?.nodeClass ?? YAMLMap;
  const map2 = new NodeClass(ctx.schema);
  if (ctx.atRoot)
    ctx.atRoot = false;
  let offset = bm.offset;
  let commentEnd = null;
  for (const collItem of bm.items) {
    const { start, key, sep, value } = collItem;
    const keyProps = resolveProps(start, {
      indicator: "explicit-key-ind",
      next: key ?? sep?.[0],
      offset,
      onError,
      parentIndent: bm.indent,
      startOnNewline: true
    });
    const implicitKey = !keyProps.found;
    if (implicitKey) {
      if (key) {
        if (key.type === "block-seq")
          onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
        else if ("indent" in key && key.indent !== bm.indent)
          onError(offset, "BAD_INDENT", startColMsg);
      }
      if (!keyProps.anchor && !keyProps.tag && !sep) {
        commentEnd = keyProps.end;
        if (keyProps.comment) {
          if (map2.comment)
            map2.comment += "\n" + keyProps.comment;
          else
            map2.comment = keyProps.comment;
        }
        continue;
      }
      if (keyProps.newlineAfterProp || containsNewline(key)) {
        onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
      }
    } else if (keyProps.found?.indent !== bm.indent) {
      onError(offset, "BAD_INDENT", startColMsg);
    }
    ctx.atKey = true;
    const keyStart = keyProps.end;
    const keyNode = key ? composeNode2(ctx, key, keyProps, onError) : composeEmptyNode2(ctx, keyStart, start, null, keyProps, onError);
    if (ctx.schema.compat)
      flowIndentCheck(bm.indent, key, onError);
    ctx.atKey = false;
    if (mapIncludes(ctx, map2.items, keyNode))
      onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
    const valueProps = resolveProps(sep ?? [], {
      indicator: "map-value-ind",
      next: value,
      offset: keyNode.range[2],
      onError,
      parentIndent: bm.indent,
      startOnNewline: !key || key.type === "block-scalar"
    });
    offset = valueProps.end;
    if (valueProps.found) {
      if (implicitKey) {
        if (value?.type === "block-map" && !valueProps.hasNewline)
          onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
        if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
          onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
      }
      const valueNode = value ? composeNode2(ctx, value, valueProps, onError) : composeEmptyNode2(ctx, offset, sep, null, valueProps, onError);
      if (ctx.schema.compat)
        flowIndentCheck(bm.indent, value, onError);
      offset = valueNode.range[2];
      const pair = new Pair(keyNode, valueNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      map2.items.push(pair);
    } else {
      if (implicitKey)
        onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
      if (valueProps.comment) {
        if (keyNode.comment)
          keyNode.comment += "\n" + valueProps.comment;
        else
          keyNode.comment = valueProps.comment;
      }
      const pair = new Pair(keyNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      map2.items.push(pair);
    }
  }
  if (commentEnd && commentEnd < offset)
    onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
  map2.range = [bm.offset, offset, commentEnd ?? offset];
  return map2;
}

// node_modules/yaml/browser/dist/compose/resolve-block-seq.js
function resolveBlockSeq({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bs, onError, tag) {
  const NodeClass = tag?.nodeClass ?? YAMLSeq;
  const seq2 = new NodeClass(ctx.schema);
  if (ctx.atRoot)
    ctx.atRoot = false;
  if (ctx.atKey)
    ctx.atKey = false;
  let offset = bs.offset;
  let commentEnd = null;
  for (const { start, value } of bs.items) {
    const props = resolveProps(start, {
      indicator: "seq-item-ind",
      next: value,
      offset,
      onError,
      parentIndent: bs.indent,
      startOnNewline: true
    });
    if (!props.found) {
      if (props.anchor || props.tag || value) {
        if (value?.type === "block-seq")
          onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
        else
          onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
      } else {
        commentEnd = props.end;
        if (props.comment)
          seq2.comment = props.comment;
        continue;
      }
    }
    const node2 = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, start, null, props, onError);
    if (ctx.schema.compat)
      flowIndentCheck(bs.indent, value, onError);
    offset = node2.range[2];
    seq2.items.push(node2);
  }
  seq2.range = [bs.offset, offset, commentEnd ?? offset];
  return seq2;
}

// node_modules/yaml/browser/dist/compose/resolve-end.js
function resolveEnd(end, offset, reqSpace, onError) {
  let comment = "";
  if (end) {
    let hasSpace = false;
    let sep = "";
    for (const token of end) {
      const { source, type } = token;
      switch (type) {
        case "space":
          hasSpace = true;
          break;
        case "comment": {
          if (reqSpace && !hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += sep + cb;
          sep = "";
          break;
        }
        case "newline":
          if (comment)
            sep += source;
          hasSpace = true;
          break;
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
      }
      offset += source.length;
    }
  }
  return { comment, offset };
}

// node_modules/yaml/browser/dist/compose/resolve-flow-collection.js
var blockMsg = "Block collections are not allowed within flow collections";
var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
function resolveFlowCollection({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, fc, onError, tag) {
  const isMap2 = fc.start.source === "{";
  const fcName = isMap2 ? "flow map" : "flow sequence";
  const NodeClass = tag?.nodeClass ?? (isMap2 ? YAMLMap : YAMLSeq);
  const coll = new NodeClass(ctx.schema);
  coll.flow = true;
  const atRoot = ctx.atRoot;
  if (atRoot)
    ctx.atRoot = false;
  if (ctx.atKey)
    ctx.atKey = false;
  let offset = fc.offset + fc.start.source.length;
  for (let i = 0; i < fc.items.length; ++i) {
    const collItem = fc.items[i];
    const { start, key, sep, value } = collItem;
    const props = resolveProps(start, {
      flow: fcName,
      indicator: "explicit-key-ind",
      next: key ?? sep?.[0],
      offset,
      onError,
      parentIndent: fc.indent,
      startOnNewline: false
    });
    if (!props.found) {
      if (!props.anchor && !props.tag && !sep && !value) {
        if (i === 0 && props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        else if (i < fc.items.length - 1)
          onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
        if (props.comment) {
          if (coll.comment)
            coll.comment += "\n" + props.comment;
          else
            coll.comment = props.comment;
        }
        offset = props.end;
        continue;
      }
      if (!isMap2 && ctx.options.strict && containsNewline(key))
        onError(
          key,
          // checked by containsNewline()
          "MULTILINE_IMPLICIT_KEY",
          "Implicit keys of flow sequence pairs need to be on a single line"
        );
    }
    if (i === 0) {
      if (props.comma)
        onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
    } else {
      if (!props.comma)
        onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
      if (props.comment) {
        let prevItemComment = "";
        loop: for (const st of start) {
          switch (st.type) {
            case "comma":
            case "space":
              break;
            case "comment":
              prevItemComment = st.source.substring(1);
              break loop;
            default:
              break loop;
          }
        }
        if (prevItemComment) {
          let prev = coll.items[coll.items.length - 1];
          if (isPair(prev))
            prev = prev.value ?? prev.key;
          if (prev.comment)
            prev.comment += "\n" + prevItemComment;
          else
            prev.comment = prevItemComment;
          props.comment = props.comment.substring(prevItemComment.length + 1);
        }
      }
    }
    if (!isMap2 && !sep && !props.found) {
      const valueNode = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, sep, null, props, onError);
      coll.items.push(valueNode);
      offset = valueNode.range[2];
      if (isBlock(value))
        onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
    } else {
      ctx.atKey = true;
      const keyStart = props.end;
      const keyNode = key ? composeNode2(ctx, key, props, onError) : composeEmptyNode2(ctx, keyStart, start, null, props, onError);
      if (isBlock(key))
        onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
      ctx.atKey = false;
      const valueProps = resolveProps(sep ?? [], {
        flow: fcName,
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (valueProps.found) {
        if (!isMap2 && !props.found && ctx.options.strict) {
          if (sep)
            for (const st of sep) {
              if (st === valueProps.found)
                break;
              if (st.type === "newline") {
                onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                break;
              }
            }
          if (props.start < valueProps.found.offset - 1024)
            onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
        }
      } else if (value) {
        if ("source" in value && value.source?.[0] === ":")
          onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
        else
          onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
      }
      const valueNode = value ? composeNode2(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode2(ctx, valueProps.end, sep, null, valueProps, onError) : null;
      if (valueNode) {
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else if (valueProps.comment) {
        if (keyNode.comment)
          keyNode.comment += "\n" + valueProps.comment;
        else
          keyNode.comment = valueProps.comment;
      }
      const pair = new Pair(keyNode, valueNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      if (isMap2) {
        const map2 = coll;
        if (mapIncludes(ctx, map2.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        map2.items.push(pair);
      } else {
        const map2 = new YAMLMap(ctx.schema);
        map2.flow = true;
        map2.items.push(pair);
        const endRange = (valueNode ?? keyNode).range;
        map2.range = [keyNode.range[0], endRange[1], endRange[2]];
        coll.items.push(map2);
      }
      offset = valueNode ? valueNode.range[2] : valueProps.end;
    }
  }
  const expectedEnd = isMap2 ? "}" : "]";
  const [ce, ...ee] = fc.end;
  let cePos = offset;
  if (ce?.source === expectedEnd)
    cePos = ce.offset + ce.source.length;
  else {
    const name = fcName[0].toUpperCase() + fcName.substring(1);
    const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
    onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
    if (ce && ce.source.length !== 1)
      ee.unshift(ce);
  }
  if (ee.length > 0) {
    const end = resolveEnd(ee, cePos, ctx.options.strict, onError);
    if (end.comment) {
      if (coll.comment)
        coll.comment += "\n" + end.comment;
      else
        coll.comment = end.comment;
    }
    coll.range = [fc.offset, cePos, end.offset];
  } else {
    coll.range = [fc.offset, cePos, cePos];
  }
  return coll;
}

// node_modules/yaml/browser/dist/compose/compose-collection.js
function resolveCollection(CN2, ctx, token, onError, tagName, tag) {
  const coll = token.type === "block-map" ? resolveBlockMap(CN2, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq(CN2, ctx, token, onError, tag) : resolveFlowCollection(CN2, ctx, token, onError, tag);
  const Coll = coll.constructor;
  if (tagName === "!" || tagName === Coll.tagName) {
    coll.tag = Coll.tagName;
    return coll;
  }
  if (tagName)
    coll.tag = tagName;
  return coll;
}
function composeCollection(CN2, ctx, token, props, onError) {
  const tagToken = props.tag;
  const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
  if (token.type === "block-seq") {
    const { anchor, newlineAfterProp: nl } = props;
    const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
    if (lastProp && (!nl || nl.offset < lastProp.offset)) {
      const message = "Missing newline after block sequence props";
      onError(lastProp, "MISSING_CHAR", message);
    }
  }
  const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
  if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.tagName && expType === "seq") {
    return resolveCollection(CN2, ctx, token, onError, tagName);
  }
  let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
  if (!tag) {
    const kt = ctx.schema.knownTags[tagName];
    if (kt?.collection === expType) {
      ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
      tag = kt;
    } else {
      if (kt) {
        onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
      } else {
        onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
      }
      return resolveCollection(CN2, ctx, token, onError, tagName);
    }
  }
  const coll = resolveCollection(CN2, ctx, token, onError, tagName, tag);
  const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
  const node2 = isNode(res) ? res : new Scalar(res);
  node2.range = coll.range;
  node2.tag = tagName;
  if (tag?.format)
    node2.format = tag.format;
  return node2;
}

// node_modules/yaml/browser/dist/compose/resolve-block-scalar.js
function resolveBlockScalar(ctx, scalar2, onError) {
  const start = scalar2.offset;
  const header = parseBlockScalarHeader(scalar2, ctx.options.strict, onError);
  if (!header)
    return { value: "", type: null, comment: "", range: [start, start, start] };
  const type = header.mode === ">" ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL;
  const lines = scalar2.source ? splitLines(scalar2.source) : [];
  let chompStart = lines.length;
  for (let i = lines.length - 1; i >= 0; --i) {
    const content3 = lines[i][1];
    if (content3 === "" || content3 === "\r")
      chompStart = i;
    else
      break;
  }
  if (chompStart === 0) {
    const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
    let end2 = start + header.length;
    if (scalar2.source)
      end2 += scalar2.source.length;
    return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
  }
  let trimIndent = scalar2.indent + header.indent;
  let offset = scalar2.offset + header.length;
  let contentStart = 0;
  for (let i = 0; i < chompStart; ++i) {
    const [indent, content3] = lines[i];
    if (content3 === "" || content3 === "\r") {
      if (header.indent === 0 && indent.length > trimIndent)
        trimIndent = indent.length;
    } else {
      if (indent.length < trimIndent) {
        const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
        onError(offset + indent.length, "MISSING_CHAR", message);
      }
      if (header.indent === 0)
        trimIndent = indent.length;
      contentStart = i;
      if (trimIndent === 0 && !ctx.atRoot) {
        const message = "Block scalar values in collections must be indented";
        onError(offset, "BAD_INDENT", message);
      }
      break;
    }
    offset += indent.length + content3.length + 1;
  }
  for (let i = lines.length - 1; i >= chompStart; --i) {
    if (lines[i][0].length > trimIndent)
      chompStart = i + 1;
  }
  let value = "";
  let sep = "";
  let prevMoreIndented = false;
  for (let i = 0; i < contentStart; ++i)
    value += lines[i][0].slice(trimIndent) + "\n";
  for (let i = contentStart; i < chompStart; ++i) {
    let [indent, content3] = lines[i];
    offset += indent.length + content3.length + 1;
    const crlf = content3[content3.length - 1] === "\r";
    if (crlf)
      content3 = content3.slice(0, -1);
    if (content3 && indent.length < trimIndent) {
      const src = header.indent ? "explicit indentation indicator" : "first line";
      const message = `Block scalar lines must not be less indented than their ${src}`;
      onError(offset - content3.length - (crlf ? 2 : 1), "BAD_INDENT", message);
      indent = "";
    }
    if (type === Scalar.BLOCK_LITERAL) {
      value += sep + indent.slice(trimIndent) + content3;
      sep = "\n";
    } else if (indent.length > trimIndent || content3[0] === "	") {
      if (sep === " ")
        sep = "\n";
      else if (!prevMoreIndented && sep === "\n")
        sep = "\n\n";
      value += sep + indent.slice(trimIndent) + content3;
      sep = "\n";
      prevMoreIndented = true;
    } else if (content3 === "") {
      if (sep === "\n")
        value += "\n";
      else
        sep = "\n";
    } else {
      value += sep + content3;
      sep = " ";
      prevMoreIndented = false;
    }
  }
  switch (header.chomp) {
    case "-":
      break;
    case "+":
      for (let i = chompStart; i < lines.length; ++i)
        value += "\n" + lines[i][0].slice(trimIndent);
      if (value[value.length - 1] !== "\n")
        value += "\n";
      break;
    default:
      value += "\n";
  }
  const end = start + header.length + scalar2.source.length;
  return { value, type, comment: header.comment, range: [start, end, end] };
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
  if (props[0].type !== "block-scalar-header") {
    onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
    return null;
  }
  const { source } = props[0];
  const mode = source[0];
  let indent = 0;
  let chomp = "";
  let error = -1;
  for (let i = 1; i < source.length; ++i) {
    const ch = source[i];
    if (!chomp && (ch === "-" || ch === "+"))
      chomp = ch;
    else {
      const n = Number(ch);
      if (!indent && n)
        indent = n;
      else if (error === -1)
        error = offset + i;
    }
  }
  if (error !== -1)
    onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
  let hasSpace = false;
  let comment = "";
  let length = source.length;
  for (let i = 1; i < props.length; ++i) {
    const token = props[i];
    switch (token.type) {
      case "space":
        hasSpace = true;
      // fallthrough
      case "newline":
        length += token.source.length;
        break;
      case "comment":
        if (strict && !hasSpace) {
          const message = "Comments must be separated from other tokens by white space characters";
          onError(token, "MISSING_CHAR", message);
        }
        length += token.source.length;
        comment = token.source.substring(1);
        break;
      case "error":
        onError(token, "UNEXPECTED_TOKEN", token.message);
        length += token.source.length;
        break;
      /* istanbul ignore next should not happen */
      default: {
        const message = `Unexpected token in block scalar header: ${token.type}`;
        onError(token, "UNEXPECTED_TOKEN", message);
        const ts = token.source;
        if (ts && typeof ts === "string")
          length += ts.length;
      }
    }
  }
  return { mode, indent, chomp, comment, length };
}
function splitLines(source) {
  const split = source.split(/\n( *)/);
  const first = split[0];
  const m = first.match(/^( *)/);
  const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
  const lines = [line0];
  for (let i = 1; i < split.length; i += 2)
    lines.push([split[i], split[i + 1]]);
  return lines;
}

// node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js
function resolveFlowScalar(scalar2, strict, onError) {
  const { offset, type, source, end } = scalar2;
  let _type;
  let value;
  const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
  switch (type) {
    case "scalar":
      _type = Scalar.PLAIN;
      value = plainValue(source, _onError);
      break;
    case "single-quoted-scalar":
      _type = Scalar.QUOTE_SINGLE;
      value = singleQuotedValue(source, _onError);
      break;
    case "double-quoted-scalar":
      _type = Scalar.QUOTE_DOUBLE;
      value = doubleQuotedValue(source, _onError);
      break;
    /* istanbul ignore next should not happen */
    default:
      onError(scalar2, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
      return {
        value: "",
        type: null,
        comment: "",
        range: [offset, offset + source.length, offset + source.length]
      };
  }
  const valueEnd = offset + source.length;
  const re = resolveEnd(end, valueEnd, strict, onError);
  return {
    value,
    type: _type,
    comment: re.comment,
    range: [offset, valueEnd, re.offset]
  };
}
function plainValue(source, onError) {
  let badChar = "";
  switch (source[0]) {
    /* istanbul ignore next should not happen */
    case "	":
      badChar = "a tab character";
      break;
    case ",":
      badChar = "flow indicator character ,";
      break;
    case "%":
      badChar = "directive indicator character %";
      break;
    case "|":
    case ">": {
      badChar = `block scalar indicator ${source[0]}`;
      break;
    }
    case "@":
    case "`": {
      badChar = `reserved character ${source[0]}`;
      break;
    }
  }
  if (badChar)
    onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
  return unfoldLines(source);
}
function singleQuotedValue(source, onError) {
  if (source[source.length - 1] !== "'" || source.length === 1)
    onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
  return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function unfoldLines(source) {
  const line = /(.*?)\r?\n/sy;
  let match = line.exec(source);
  if (!match)
    return source;
  let trimEnd, trimBoth;
  try {
    trimEnd = new RegExp("(?<![ 	])[ 	]+$");
    trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
  } catch {
    trimEnd = /[ \t]+$/;
    trimBoth = /^[ \t]+|[ \t]+$/g;
  }
  let res = match[1].replace(trimEnd, "");
  let sep = " ";
  let pos = line.lastIndex;
  while (match = line.exec(source)) {
    const lm = match[1].replace(trimBoth, "");
    if (lm === "") {
      if (sep === "\n")
        res += sep;
      else
        sep = "\n";
    } else {
      res += sep + lm;
      sep = " ";
    }
    pos = line.lastIndex;
  }
  const last = /[ \t]*(.*)/sy;
  last.lastIndex = pos;
  match = last.exec(source);
  return res + sep + (match?.[1] ?? "");
}
function doubleQuotedValue(source, onError) {
  let res = "";
  for (let i = 1; i < source.length - 1; ++i) {
    const ch = source[i];
    if (ch === "\r" && source[i + 1] === "\n")
      continue;
    if (ch === "\n") {
      const { fold, offset } = foldNewline(source, i);
      res += fold;
      i = offset;
    } else if (ch === "\\") {
      let next = source[++i];
      const cc = escapeCodes[next];
      if (cc)
        res += cc;
      else if (next === "\n") {
        next = source[i + 1];
        while (next === " " || next === "	")
          next = source[++i + 1];
      } else if (next === "\r" && source[i + 1] === "\n") {
        next = source[++i + 1];
        while (next === " " || next === "	")
          next = source[++i + 1];
      } else if (next === "x" || next === "u" || next === "U") {
        const length = next === "x" ? 2 : next === "u" ? 4 : 8;
        res += parseCharCode(source, i + 1, length, onError);
        i += length;
      } else {
        const raw = source.substr(i - 1, 2);
        onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        res += raw;
      }
    } else if (ch === " " || ch === "	") {
      const wsStart = i;
      let next = source[i + 1];
      while (next === " " || next === "	")
        next = source[++i + 1];
      if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
        res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
    } else {
      res += ch;
    }
  }
  if (source[source.length - 1] !== '"' || source.length === 1)
    onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
  return res;
}
function foldNewline(source, offset) {
  let fold = "";
  let ch = source[offset + 1];
  while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
    if (ch === "\r" && source[offset + 2] !== "\n")
      break;
    if (ch === "\n")
      fold += "\n";
    offset += 1;
    ch = source[offset + 1];
  }
  if (!fold)
    fold = " ";
  return { fold, offset };
}
var escapeCodes = {
  "0": "\0",
  // null character
  a: "\x07",
  // bell character
  b: "\b",
  // backspace
  e: "\x1B",
  // escape character
  f: "\f",
  // form feed
  n: "\n",
  // line feed
  r: "\r",
  // carriage return
  t: "	",
  // horizontal tab
  v: "\v",
  // vertical tab
  N: "\x85",
  // Unicode next line
  _: "\xA0",
  // Unicode non-breaking space
  L: "\u2028",
  // Unicode line separator
  P: "\u2029",
  // Unicode paragraph separator
  " ": " ",
  '"': '"',
  "/": "/",
  "\\": "\\",
  "	": "	"
};
function parseCharCode(source, offset, length, onError) {
  const cc = source.substr(offset, length);
  const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
  const code = ok ? parseInt(cc, 16) : NaN;
  try {
    return String.fromCodePoint(code);
  } catch {
    const raw = source.substr(offset - 2, length + 2);
    onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
    return raw;
  }
}

// node_modules/yaml/browser/dist/compose/compose-scalar.js
function composeScalar(ctx, token, tagToken, onError) {
  const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar(ctx, token, onError) : resolveFlowScalar(token, ctx.options.strict, onError);
  const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
  let tag;
  if (ctx.options.stringKeys && ctx.atKey) {
    tag = ctx.schema[SCALAR];
  } else if (tagName)
    tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
  else if (token.type === "scalar")
    tag = findScalarTagByTest(ctx, value, token, onError);
  else
    tag = ctx.schema[SCALAR];
  let scalar2;
  try {
    const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
    scalar2 = isScalar(res) ? res : new Scalar(res);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
    scalar2 = new Scalar(value);
  }
  scalar2.range = range;
  scalar2.source = value;
  if (type)
    scalar2.type = type;
  if (tagName)
    scalar2.tag = tagName;
  if (tag.format)
    scalar2.format = tag.format;
  if (comment)
    scalar2.comment = comment;
  return scalar2;
}
function findScalarTagByName(schema4, value, tagName, tagToken, onError) {
  if (tagName === "!")
    return schema4[SCALAR];
  const matchWithTest = [];
  for (const tag of schema4.tags) {
    if (!tag.collection && tag.tag === tagName) {
      if (tag.default && tag.test)
        matchWithTest.push(tag);
      else
        return tag;
    }
  }
  for (const tag of matchWithTest)
    if (tag.test?.test(value))
      return tag;
  const kt = schema4.knownTags[tagName];
  if (kt && !kt.collection) {
    schema4.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
    return kt;
  }
  onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
  return schema4[SCALAR];
}
function findScalarTagByTest({ atKey, directives, schema: schema4 }, value, token, onError) {
  const tag = schema4.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema4[SCALAR];
  if (schema4.compat) {
    const compat = schema4.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema4[SCALAR];
    if (tag.tag !== compat.tag) {
      const ts = directives.tagString(tag.tag);
      const cs = directives.tagString(compat.tag);
      const msg = `Value may be parsed as either ${ts} or ${cs}`;
      onError(token, "TAG_RESOLVE_FAILED", msg, true);
    }
  }
  return tag;
}

// node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js
function emptyScalarPosition(offset, before, pos) {
  if (before) {
    pos ?? (pos = before.length);
    for (let i = pos - 1; i >= 0; --i) {
      let st = before[i];
      switch (st.type) {
        case "space":
        case "comment":
        case "newline":
          offset -= st.source.length;
          continue;
      }
      st = before[++i];
      while (st?.type === "space") {
        offset += st.source.length;
        st = before[++i];
      }
      break;
    }
  }
  return offset;
}

// node_modules/yaml/browser/dist/compose/compose-node.js
var CN = { composeNode, composeEmptyNode };
function composeNode(ctx, token, props, onError) {
  const atKey = ctx.atKey;
  const { spaceBefore, comment, anchor, tag } = props;
  let node2;
  let isSrcToken = true;
  switch (token.type) {
    case "alias":
      node2 = composeAlias(ctx, token, onError);
      if (anchor || tag)
        onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
      break;
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "block-scalar":
      node2 = composeScalar(ctx, token, tag, onError);
      if (anchor)
        node2.anchor = anchor.source.substring(1);
      break;
    case "block-map":
    case "block-seq":
    case "flow-collection":
      try {
        node2 = composeCollection(CN, ctx, token, props, onError);
        if (anchor)
          node2.anchor = anchor.source.substring(1);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onError(token, "RESOURCE_EXHAUSTION", message);
      }
      break;
    default: {
      const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
      onError(token, "UNEXPECTED_TOKEN", message);
      isSrcToken = false;
    }
  }
  node2 ?? (node2 = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
  if (anchor && node2.anchor === "")
    onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
  if (atKey && ctx.options.stringKeys && (!isScalar(node2) || typeof node2.value !== "string" || node2.tag && node2.tag !== "tag:yaml.org,2002:str")) {
    const msg = "With stringKeys, all keys must be strings";
    onError(tag ?? token, "NON_STRING_KEY", msg);
  }
  if (spaceBefore)
    node2.spaceBefore = true;
  if (comment) {
    if (token.type === "scalar" && token.source === "")
      node2.comment = comment;
    else
      node2.commentBefore = comment;
  }
  if (ctx.options.keepSourceTokens && isSrcToken)
    node2.srcToken = token;
  return node2;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
  const token = {
    type: "scalar",
    offset: emptyScalarPosition(offset, before, pos),
    indent: -1,
    source: ""
  };
  const node2 = composeScalar(ctx, token, tag, onError);
  if (anchor) {
    node2.anchor = anchor.source.substring(1);
    if (node2.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
  }
  if (spaceBefore)
    node2.spaceBefore = true;
  if (comment) {
    node2.comment = comment;
    node2.range[2] = end;
  }
  return node2;
}
function composeAlias({ options }, { offset, source, end }, onError) {
  const alias = new Alias(source.substring(1));
  if (alias.source === "")
    onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
  if (alias.source.endsWith(":"))
    onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
  const valueEnd = offset + source.length;
  const re = resolveEnd(end, valueEnd, options.strict, onError);
  alias.range = [offset, valueEnd, re.offset];
  if (re.comment)
    alias.comment = re.comment;
  return alias;
}

// node_modules/yaml/browser/dist/compose/compose-doc.js
function composeDoc(options, directives, { offset, start, value, end }, onError) {
  const opts = Object.assign({ _directives: directives }, options);
  const doc = new Document(void 0, opts);
  const ctx = {
    atKey: false,
    atRoot: true,
    directives: doc.directives,
    options: doc.options,
    schema: doc.schema
  };
  const props = resolveProps(start, {
    indicator: "doc-start",
    next: value ?? end?.[0],
    offset,
    onError,
    parentIndent: 0,
    startOnNewline: true
  });
  if (props.found) {
    doc.directives.docStart = true;
    if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
      onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
  }
  doc.contents = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
  const contentEnd = doc.contents.range[2];
  const re = resolveEnd(end, contentEnd, false, onError);
  if (re.comment)
    doc.comment = re.comment;
  doc.range = [offset, contentEnd, re.offset];
  return doc;
}

// node_modules/yaml/browser/dist/compose/composer.js
function getErrorPos(src) {
  if (typeof src === "number")
    return [src, src + 1];
  if (Array.isArray(src))
    return src.length === 2 ? src : [src[0], src[1]];
  const { offset, source } = src;
  return [offset, offset + (typeof source === "string" ? source.length : 1)];
}
function parsePrelude(prelude) {
  let comment = "";
  let atComment = false;
  let afterEmptyLine = false;
  for (let i = 0; i < prelude.length; ++i) {
    const source = prelude[i];
    switch (source[0]) {
      case "#":
        comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
        atComment = true;
        afterEmptyLine = false;
        break;
      case "%":
        if (prelude[i + 1]?.[0] !== "#")
          i += 1;
        atComment = false;
        break;
      default:
        if (!atComment)
          afterEmptyLine = true;
        atComment = false;
    }
  }
  return { comment, afterEmptyLine };
}
var Composer = class {
  constructor(options = {}) {
    this.doc = null;
    this.atDirectives = false;
    this.prelude = [];
    this.errors = [];
    this.warnings = [];
    this.onError = (source, code, message, warning) => {
      const pos = getErrorPos(source);
      if (warning)
        this.warnings.push(new YAMLWarning(pos, code, message));
      else
        this.errors.push(new YAMLParseError(pos, code, message));
    };
    this.directives = new Directives({ version: options.version || "1.2" });
    this.options = options;
  }
  decorate(doc, afterDoc) {
    const { comment, afterEmptyLine } = parsePrelude(this.prelude);
    if (comment) {
      const dc = doc.contents;
      if (afterDoc) {
        doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
      } else if (afterEmptyLine || doc.directives.docStart || !dc) {
        doc.commentBefore = comment;
      } else if (isCollection(dc) && !dc.flow && dc.items.length > 0) {
        let it = dc.items[0];
        if (isPair(it))
          it = it.key;
        const cb = it.commentBefore;
        it.commentBefore = cb ? `${comment}
${cb}` : comment;
      } else {
        const cb = dc.commentBefore;
        dc.commentBefore = cb ? `${comment}
${cb}` : comment;
      }
    }
    if (afterDoc) {
      for (let i = 0; i < this.errors.length; ++i)
        doc.errors.push(this.errors[i]);
      for (let i = 0; i < this.warnings.length; ++i)
        doc.warnings.push(this.warnings[i]);
    } else {
      doc.errors = this.errors;
      doc.warnings = this.warnings;
    }
    this.prelude = [];
    this.errors = [];
    this.warnings = [];
  }
  /**
   * Current stream status information.
   *
   * Mostly useful at the end of input for an empty stream.
   */
  streamInfo() {
    return {
      comment: parsePrelude(this.prelude).comment,
      directives: this.directives,
      errors: this.errors,
      warnings: this.warnings
    };
  }
  /**
   * Compose tokens into documents.
   *
   * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
   * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
   */
  *compose(tokens, forceDoc = false, endOffset = -1) {
    for (const token of tokens)
      yield* this.next(token);
    yield* this.end(forceDoc, endOffset);
  }
  /** Advance the composer by one CST token. */
  *next(token) {
    switch (token.type) {
      case "directive":
        this.directives.add(token.source, (offset, message, warning) => {
          const pos = getErrorPos(token);
          pos[0] += offset;
          this.onError(pos, "BAD_DIRECTIVE", message, warning);
        });
        this.prelude.push(token.source);
        this.atDirectives = true;
        break;
      case "document": {
        const doc = composeDoc(this.options, this.directives, token, this.onError);
        if (this.atDirectives && !doc.directives.docStart)
          this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
        this.decorate(doc, false);
        if (this.doc)
          yield this.doc;
        this.doc = doc;
        this.atDirectives = false;
        break;
      }
      case "byte-order-mark":
      case "space":
        break;
      case "comment":
      case "newline":
        this.prelude.push(token.source);
        break;
      case "error": {
        const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
        const error = new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
        if (this.atDirectives || !this.doc)
          this.errors.push(error);
        else
          this.doc.errors.push(error);
        break;
      }
      case "doc-end": {
        if (!this.doc) {
          const msg = "Unexpected doc-end without preceding document";
          this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
          break;
        }
        this.doc.directives.docEnd = true;
        const end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
        this.decorate(this.doc, true);
        if (end.comment) {
          const dc = this.doc.comment;
          this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
        }
        this.doc.range[2] = end.offset;
        break;
      }
      default:
        this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
    }
  }
  /**
   * Call at end of input to yield any remaining document.
   *
   * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
   * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
   */
  *end(forceDoc = false, endOffset = -1) {
    if (this.doc) {
      this.decorate(this.doc, true);
      yield this.doc;
      this.doc = null;
    } else if (forceDoc) {
      const opts = Object.assign({ _directives: this.directives }, this.options);
      const doc = new Document(void 0, opts);
      if (this.atDirectives)
        this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
      doc.range = [0, endOffset, endOffset];
      this.decorate(doc, false);
      yield doc;
    }
  }
};

// node_modules/yaml/browser/dist/parse/cst-visit.js
var BREAK2 = Symbol("break visit");
var SKIP2 = Symbol("skip children");
var REMOVE2 = Symbol("remove item");
function visit2(cst, visitor) {
  if ("type" in cst && cst.type === "document")
    cst = { start: cst.start, value: cst.value };
  _visit(Object.freeze([]), cst, visitor);
}
visit2.BREAK = BREAK2;
visit2.SKIP = SKIP2;
visit2.REMOVE = REMOVE2;
visit2.itemAtPath = (cst, path) => {
  let item = cst;
  for (const [field, index2] of path) {
    const tok = item?.[field];
    if (tok && "items" in tok) {
      item = tok.items[index2];
    } else
      return void 0;
  }
  return item;
};
visit2.parentCollection = (cst, path) => {
  const parent = visit2.itemAtPath(cst, path.slice(0, -1));
  const field = path[path.length - 1][0];
  const coll = parent?.[field];
  if (coll && "items" in coll)
    return coll;
  throw new Error("Parent collection not found");
};
function _visit(path, item, visitor) {
  let ctrl = visitor(item, path);
  if (typeof ctrl === "symbol")
    return ctrl;
  for (const field of ["key", "value"]) {
    const token = item[field];
    if (token && "items" in token) {
      for (let i = 0; i < token.items.length; ++i) {
        const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK2)
          return BREAK2;
        else if (ci === REMOVE2) {
          token.items.splice(i, 1);
          i -= 1;
        }
      }
      if (typeof ctrl === "function" && field === "key")
        ctrl = ctrl(item, path);
    }
  }
  return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
}

// node_modules/yaml/browser/dist/parse/cst.js
var BOM = "\uFEFF";
var DOCUMENT = "";
var FLOW_END = "";
var SCALAR2 = "";
function tokenType(source) {
  switch (source) {
    case BOM:
      return "byte-order-mark";
    case DOCUMENT:
      return "doc-mode";
    case FLOW_END:
      return "flow-error-end";
    case SCALAR2:
      return "scalar";
    case "---":
      return "doc-start";
    case "...":
      return "doc-end";
    case "":
    case "\n":
    case "\r\n":
      return "newline";
    case "-":
      return "seq-item-ind";
    case "?":
      return "explicit-key-ind";
    case ":":
      return "map-value-ind";
    case "{":
      return "flow-map-start";
    case "}":
      return "flow-map-end";
    case "[":
      return "flow-seq-start";
    case "]":
      return "flow-seq-end";
    case ",":
      return "comma";
  }
  switch (source[0]) {
    case " ":
    case "	":
      return "space";
    case "#":
      return "comment";
    case "%":
      return "directive-line";
    case "*":
      return "alias";
    case "&":
      return "anchor";
    case "!":
      return "tag";
    case "'":
      return "single-quoted-scalar";
    case '"':
      return "double-quoted-scalar";
    case "|":
    case ">":
      return "block-scalar-header";
  }
  return null;
}

// node_modules/yaml/browser/dist/parse/lexer.js
function isEmpty(ch) {
  switch (ch) {
    case void 0:
    case " ":
    case "\n":
    case "\r":
    case "	":
      return true;
    default:
      return false;
  }
}
var hexDigits = new Set("0123456789ABCDEFabcdef");
var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
var flowIndicatorChars = new Set(",[]{}");
var invalidAnchorChars = new Set(" ,[]{}\n\r	");
var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
var Lexer = class {
  constructor() {
    this.atEnd = false;
    this.blockScalarIndent = -1;
    this.blockScalarKeep = false;
    this.buffer = "";
    this.flowKey = false;
    this.flowLevel = 0;
    this.indentNext = 0;
    this.indentValue = 0;
    this.lineEndPos = null;
    this.next = null;
    this.pos = 0;
  }
  /**
   * Generate YAML tokens from the `source` string. If `incomplete`,
   * a part of the last line may be left as a buffer for the next call.
   *
   * @returns A generator of lexical tokens
   */
  *lex(source, incomplete = false) {
    if (source) {
      if (typeof source !== "string")
        throw TypeError("source is not a string");
      this.buffer = this.buffer ? this.buffer + source : source;
      this.lineEndPos = null;
    }
    this.atEnd = !incomplete;
    let next = this.next ?? "stream";
    while (next && (incomplete || this.hasChars(1)))
      next = yield* this.parseNext(next);
  }
  atLineEnd() {
    let i = this.pos;
    let ch = this.buffer[i];
    while (ch === " " || ch === "	")
      ch = this.buffer[++i];
    if (!ch || ch === "#" || ch === "\n")
      return true;
    if (ch === "\r")
      return this.buffer[i + 1] === "\n";
    return false;
  }
  charAt(n) {
    return this.buffer[this.pos + n];
  }
  continueScalar(offset) {
    let ch = this.buffer[offset];
    if (this.indentNext > 0) {
      let indent = 0;
      while (ch === " ")
        ch = this.buffer[++indent + offset];
      if (ch === "\r") {
        const next = this.buffer[indent + offset + 1];
        if (next === "\n" || !next && !this.atEnd)
          return offset + indent + 1;
      }
      return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
    }
    if (ch === "-" || ch === ".") {
      const dt = this.buffer.substr(offset, 3);
      if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
        return -1;
    }
    return offset;
  }
  getLine() {
    let end = this.lineEndPos;
    if (typeof end !== "number" || end !== -1 && end < this.pos) {
      end = this.buffer.indexOf("\n", this.pos);
      this.lineEndPos = end;
    }
    if (end === -1)
      return this.atEnd ? this.buffer.substring(this.pos) : null;
    if (this.buffer[end - 1] === "\r")
      end -= 1;
    return this.buffer.substring(this.pos, end);
  }
  hasChars(n) {
    return this.pos + n <= this.buffer.length;
  }
  setNext(state) {
    this.buffer = this.buffer.substring(this.pos);
    this.pos = 0;
    this.lineEndPos = null;
    this.next = state;
    return null;
  }
  peek(n) {
    return this.buffer.substr(this.pos, n);
  }
  *parseNext(next) {
    switch (next) {
      case "stream":
        return yield* this.parseStream();
      case "line-start":
        return yield* this.parseLineStart();
      case "block-start":
        return yield* this.parseBlockStart();
      case "doc":
        return yield* this.parseDocument();
      case "flow":
        return yield* this.parseFlowCollection();
      case "quoted-scalar":
        return yield* this.parseQuotedScalar();
      case "block-scalar":
        return yield* this.parseBlockScalar();
      case "plain-scalar":
        return yield* this.parsePlainScalar();
    }
  }
  *parseStream() {
    let line = this.getLine();
    if (line === null)
      return this.setNext("stream");
    if (line[0] === BOM) {
      yield* this.pushCount(1);
      line = line.substring(1);
    }
    if (line[0] === "%") {
      let dirEnd = line.length;
      let cs = line.indexOf("#");
      while (cs !== -1) {
        const ch = line[cs - 1];
        if (ch === " " || ch === "	") {
          dirEnd = cs - 1;
          break;
        } else {
          cs = line.indexOf("#", cs + 1);
        }
      }
      while (true) {
        const ch = line[dirEnd - 1];
        if (ch === " " || ch === "	")
          dirEnd -= 1;
        else
          break;
      }
      const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
      yield* this.pushCount(line.length - n);
      this.pushNewline();
      return "stream";
    }
    if (this.atLineEnd()) {
      const sp = yield* this.pushSpaces(true);
      yield* this.pushCount(line.length - sp);
      yield* this.pushNewline();
      return "stream";
    }
    yield DOCUMENT;
    return yield* this.parseLineStart();
  }
  *parseLineStart() {
    const ch = this.charAt(0);
    if (!ch && !this.atEnd)
      return this.setNext("line-start");
    if (ch === "-" || ch === ".") {
      if (!this.atEnd && !this.hasChars(4))
        return this.setNext("line-start");
      const s = this.peek(3);
      if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
        yield* this.pushCount(3);
        this.indentValue = 0;
        this.indentNext = 0;
        return s === "---" ? "doc" : "stream";
      }
    }
    this.indentValue = yield* this.pushSpaces(false);
    if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
      this.indentNext = this.indentValue;
    return yield* this.parseBlockStart();
  }
  *parseBlockStart() {
    const [ch0, ch1] = this.peek(2);
    if (!ch1 && !this.atEnd)
      return this.setNext("block-start");
    if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
      const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
      this.indentNext = this.indentValue + 1;
      this.indentValue += n;
      return "block-start";
    }
    return "doc";
  }
  *parseDocument() {
    yield* this.pushSpaces(true);
    const line = this.getLine();
    if (line === null)
      return this.setNext("doc");
    let n = yield* this.pushIndicators();
    switch (line[n]) {
      case "#":
        yield* this.pushCount(line.length - n);
      // fallthrough
      case void 0:
        yield* this.pushNewline();
        return yield* this.parseLineStart();
      case "{":
      case "[":
        yield* this.pushCount(1);
        this.flowKey = false;
        this.flowLevel = 1;
        return "flow";
      case "}":
      case "]":
        yield* this.pushCount(1);
        return "doc";
      case "*":
        yield* this.pushUntil(isNotAnchorChar);
        return "doc";
      case '"':
      case "'":
        return yield* this.parseQuotedScalar();
      case "|":
      case ">":
        n += yield* this.parseBlockScalarHeader();
        n += yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - n);
        yield* this.pushNewline();
        return yield* this.parseBlockScalar();
      default:
        return yield* this.parsePlainScalar();
    }
  }
  *parseFlowCollection() {
    let nl, sp;
    let indent = -1;
    do {
      nl = yield* this.pushNewline();
      if (nl > 0) {
        sp = yield* this.pushSpaces(false);
        this.indentValue = indent = sp;
      } else {
        sp = 0;
      }
      sp += yield* this.pushSpaces(true);
    } while (nl + sp > 0);
    const line = this.getLine();
    if (line === null)
      return this.setNext("flow");
    if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
      const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
      if (!atFlowEndMarker) {
        this.flowLevel = 0;
        yield FLOW_END;
        return yield* this.parseLineStart();
      }
    }
    let n = 0;
    while (line[n] === ",") {
      n += yield* this.pushCount(1);
      n += yield* this.pushSpaces(true);
      this.flowKey = false;
    }
    n += yield* this.pushIndicators();
    switch (line[n]) {
      case void 0:
        return "flow";
      case "#":
        yield* this.pushCount(line.length - n);
        return "flow";
      case "{":
      case "[":
        yield* this.pushCount(1);
        this.flowKey = false;
        this.flowLevel += 1;
        return "flow";
      case "}":
      case "]":
        yield* this.pushCount(1);
        this.flowKey = true;
        this.flowLevel -= 1;
        return this.flowLevel ? "flow" : "doc";
      case "*":
        yield* this.pushUntil(isNotAnchorChar);
        return "flow";
      case '"':
      case "'":
        this.flowKey = true;
        return yield* this.parseQuotedScalar();
      case ":": {
        const next = this.charAt(1);
        if (this.flowKey || isEmpty(next) || next === ",") {
          this.flowKey = false;
          yield* this.pushCount(1);
          yield* this.pushSpaces(true);
          return "flow";
        }
      }
      // fallthrough
      default:
        this.flowKey = false;
        return yield* this.parsePlainScalar();
    }
  }
  *parseQuotedScalar() {
    const quote = this.charAt(0);
    let end = this.buffer.indexOf(quote, this.pos + 1);
    if (quote === "'") {
      while (end !== -1 && this.buffer[end + 1] === "'")
        end = this.buffer.indexOf("'", end + 2);
    } else {
      while (end !== -1) {
        let n = 0;
        while (this.buffer[end - 1 - n] === "\\")
          n += 1;
        if (n % 2 === 0)
          break;
        end = this.buffer.indexOf('"', end + 1);
      }
    }
    const qb = this.buffer.substring(0, end);
    let nl = qb.indexOf("\n", this.pos);
    if (nl !== -1) {
      while (nl !== -1) {
        const cs = this.continueScalar(nl + 1);
        if (cs === -1)
          break;
        nl = qb.indexOf("\n", cs);
      }
      if (nl !== -1) {
        end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
      }
    }
    if (end === -1) {
      if (!this.atEnd)
        return this.setNext("quoted-scalar");
      end = this.buffer.length;
    }
    yield* this.pushToIndex(end + 1, false);
    return this.flowLevel ? "flow" : "doc";
  }
  *parseBlockScalarHeader() {
    this.blockScalarIndent = -1;
    this.blockScalarKeep = false;
    let i = this.pos;
    while (true) {
      const ch = this.buffer[++i];
      if (ch === "+")
        this.blockScalarKeep = true;
      else if (ch > "0" && ch <= "9")
        this.blockScalarIndent = Number(ch) - 1;
      else if (ch !== "-")
        break;
    }
    return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
  }
  *parseBlockScalar() {
    let nl = this.pos - 1;
    let indent = 0;
    let ch;
    loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
      switch (ch) {
        case " ":
          indent += 1;
          break;
        case "\n":
          nl = i2;
          indent = 0;
          break;
        case "\r": {
          const next = this.buffer[i2 + 1];
          if (!next && !this.atEnd)
            return this.setNext("block-scalar");
          if (next === "\n")
            break;
        }
        // fallthrough
        default:
          break loop;
      }
    }
    if (!ch && !this.atEnd)
      return this.setNext("block-scalar");
    if (indent >= this.indentNext) {
      if (this.blockScalarIndent === -1)
        this.indentNext = indent;
      else {
        this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
      }
      do {
        const cs = this.continueScalar(nl + 1);
        if (cs === -1)
          break;
        nl = this.buffer.indexOf("\n", cs);
      } while (nl !== -1);
      if (nl === -1) {
        if (!this.atEnd)
          return this.setNext("block-scalar");
        nl = this.buffer.length;
      }
    }
    let i = nl + 1;
    ch = this.buffer[i];
    while (ch === " ")
      ch = this.buffer[++i];
    if (ch === "	") {
      while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
        ch = this.buffer[++i];
      nl = i - 1;
    } else if (!this.blockScalarKeep) {
      do {
        let i2 = nl - 1;
        let ch2 = this.buffer[i2];
        if (ch2 === "\r")
          ch2 = this.buffer[--i2];
        const lastChar = i2;
        while (ch2 === " ")
          ch2 = this.buffer[--i2];
        if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
          nl = i2;
        else
          break;
      } while (true);
    }
    yield SCALAR2;
    yield* this.pushToIndex(nl + 1, true);
    return yield* this.parseLineStart();
  }
  *parsePlainScalar() {
    const inFlow = this.flowLevel > 0;
    let end = this.pos - 1;
    let i = this.pos - 1;
    let ch;
    while (ch = this.buffer[++i]) {
      if (ch === ":") {
        const next = this.buffer[i + 1];
        if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
          break;
        end = i;
      } else if (isEmpty(ch)) {
        let next = this.buffer[i + 1];
        if (ch === "\r") {
          if (next === "\n") {
            i += 1;
            ch = "\n";
            next = this.buffer[i + 1];
          } else
            end = i;
        }
        if (next === "#" || inFlow && flowIndicatorChars.has(next))
          break;
        if (ch === "\n") {
          const cs = this.continueScalar(i + 1);
          if (cs === -1)
            break;
          i = Math.max(i, cs - 2);
        }
      } else {
        if (inFlow && flowIndicatorChars.has(ch))
          break;
        end = i;
      }
    }
    if (!ch && !this.atEnd)
      return this.setNext("plain-scalar");
    yield SCALAR2;
    yield* this.pushToIndex(end + 1, true);
    return inFlow ? "flow" : "doc";
  }
  *pushCount(n) {
    if (n > 0) {
      yield this.buffer.substr(this.pos, n);
      this.pos += n;
      return n;
    }
    return 0;
  }
  *pushToIndex(i, allowEmpty) {
    const s = this.buffer.slice(this.pos, i);
    if (s) {
      yield s;
      this.pos += s.length;
      return s.length;
    } else if (allowEmpty)
      yield "";
    return 0;
  }
  *pushIndicators() {
    let n = 0;
    loop: while (true) {
      switch (this.charAt(0)) {
        case "!":
          n += yield* this.pushTag();
          n += yield* this.pushSpaces(true);
          continue loop;
        case "&":
          n += yield* this.pushUntil(isNotAnchorChar);
          n += yield* this.pushSpaces(true);
          continue loop;
        case "-":
        // this is an error
        case "?":
        // this is an error outside flow collections
        case ":": {
          const inFlow = this.flowLevel > 0;
          const ch1 = this.charAt(1);
          if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
            if (!inFlow)
              this.indentNext = this.indentValue + 1;
            else if (this.flowKey)
              this.flowKey = false;
            n += yield* this.pushCount(1);
            n += yield* this.pushSpaces(true);
            continue loop;
          }
        }
      }
      break loop;
    }
    return n;
  }
  *pushTag() {
    if (this.charAt(1) === "<") {
      let i = this.pos + 2;
      let ch = this.buffer[i];
      while (!isEmpty(ch) && ch !== ">")
        ch = this.buffer[++i];
      return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
    } else {
      let i = this.pos + 1;
      let ch = this.buffer[i];
      while (ch) {
        if (tagChars.has(ch))
          ch = this.buffer[++i];
        else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
          ch = this.buffer[i += 3];
        } else
          break;
      }
      return yield* this.pushToIndex(i, false);
    }
  }
  *pushNewline() {
    const ch = this.buffer[this.pos];
    if (ch === "\n")
      return yield* this.pushCount(1);
    else if (ch === "\r" && this.charAt(1) === "\n")
      return yield* this.pushCount(2);
    else
      return 0;
  }
  *pushSpaces(allowTabs) {
    let i = this.pos - 1;
    let ch;
    do {
      ch = this.buffer[++i];
    } while (ch === " " || allowTabs && ch === "	");
    const n = i - this.pos;
    if (n > 0) {
      yield this.buffer.substr(this.pos, n);
      this.pos = i;
    }
    return n;
  }
  *pushUntil(test) {
    let i = this.pos;
    let ch = this.buffer[i];
    while (!test(ch))
      ch = this.buffer[++i];
    return yield* this.pushToIndex(i, false);
  }
};

// node_modules/yaml/browser/dist/parse/line-counter.js
var LineCounter = class {
  constructor() {
    this.lineStarts = [];
    this.addNewLine = (offset) => this.lineStarts.push(offset);
    this.linePos = (offset) => {
      let low = 0;
      let high = this.lineStarts.length;
      while (low < high) {
        const mid = low + high >> 1;
        if (this.lineStarts[mid] < offset)
          low = mid + 1;
        else
          high = mid;
      }
      if (this.lineStarts[low] === offset)
        return { line: low + 1, col: 1 };
      if (low === 0)
        return { line: 0, col: offset };
      const start = this.lineStarts[low - 1];
      return { line: low, col: offset - start + 1 };
    };
  }
};

// node_modules/yaml/browser/dist/parse/parser.js
function includesToken(list2, type) {
  for (let i = 0; i < list2.length; ++i)
    if (list2[i].type === type)
      return true;
  return false;
}
function findNonEmptyIndex(list2) {
  for (let i = 0; i < list2.length; ++i) {
    switch (list2[i].type) {
      case "space":
      case "comment":
      case "newline":
        break;
      default:
        return i;
    }
  }
  return -1;
}
function isFlowToken(token) {
  switch (token?.type) {
    case "alias":
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "flow-collection":
      return true;
    default:
      return false;
  }
}
function getPrevProps(parent) {
  switch (parent.type) {
    case "document":
      return parent.start;
    case "block-map": {
      const it = parent.items[parent.items.length - 1];
      return it.sep ?? it.start;
    }
    case "block-seq":
      return parent.items[parent.items.length - 1].start;
    /* istanbul ignore next should not happen */
    default:
      return [];
  }
}
function getFirstKeyStartProps(prev) {
  if (prev.length === 0)
    return [];
  let i = prev.length;
  loop: while (--i >= 0) {
    switch (prev[i].type) {
      case "doc-start":
      case "explicit-key-ind":
      case "map-value-ind":
      case "seq-item-ind":
      case "newline":
        break loop;
    }
  }
  while (prev[++i]?.type === "space") {
  }
  return prev.splice(i, prev.length);
}
function arrayPushArray(target, source) {
  if (source.length < 1e5)
    Array.prototype.push.apply(target, source);
  else
    for (let i = 0; i < source.length; ++i)
      target.push(source[i]);
}
function fixFlowSeqItems(fc) {
  if (fc.start.type === "flow-seq-start") {
    for (const it of fc.items) {
      if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
        if (it.key)
          it.value = it.key;
        delete it.key;
        if (isFlowToken(it.value)) {
          if (it.value.end)
            arrayPushArray(it.value.end, it.sep);
          else
            it.value.end = it.sep;
        } else
          arrayPushArray(it.start, it.sep);
        delete it.sep;
      }
    }
  }
}
var Parser = class {
  /**
   * @param onNewLine - If defined, called separately with the start position of
   *   each new line (in `parse()`, including the start of input).
   */
  constructor(onNewLine) {
    this.atNewLine = true;
    this.atScalar = false;
    this.indent = 0;
    this.offset = 0;
    this.onKeyLine = false;
    this.stack = [];
    this.source = "";
    this.type = "";
    this.lexer = new Lexer();
    this.onNewLine = onNewLine;
  }
  /**
   * Parse `source` as a YAML stream.
   * If `incomplete`, a part of the last line may be left as a buffer for the next call.
   *
   * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
   *
   * @returns A generator of tokens representing each directive, document, and other structure.
   */
  *parse(source, incomplete = false) {
    if (this.onNewLine && this.offset === 0)
      this.onNewLine(0);
    for (const lexeme of this.lexer.lex(source, incomplete))
      yield* this.next(lexeme);
    if (!incomplete)
      yield* this.end();
  }
  /**
   * Advance the parser by the `source` of one lexical token.
   */
  *next(source) {
    this.source = source;
    if (this.atScalar) {
      this.atScalar = false;
      yield* this.step();
      this.offset += source.length;
      return;
    }
    const type = tokenType(source);
    if (!type) {
      const message = `Not a YAML token: ${source}`;
      yield* this.pop({ type: "error", offset: this.offset, message, source });
      this.offset += source.length;
    } else if (type === "scalar") {
      this.atNewLine = false;
      this.atScalar = true;
      this.type = "scalar";
    } else {
      this.type = type;
      yield* this.step();
      switch (type) {
        case "newline":
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine)
            this.onNewLine(this.offset + source.length);
          break;
        case "space":
          if (this.atNewLine && source[0] === " ")
            this.indent += source.length;
          break;
        case "explicit-key-ind":
        case "map-value-ind":
        case "seq-item-ind":
          if (this.atNewLine)
            this.indent += source.length;
          break;
        case "doc-mode":
        case "flow-error-end":
          return;
        default:
          this.atNewLine = false;
      }
      this.offset += source.length;
    }
  }
  /** Call at end of input to push out any remaining constructions */
  *end() {
    while (this.stack.length > 0)
      yield* this.pop();
  }
  get sourceToken() {
    const st = {
      type: this.type,
      offset: this.offset,
      indent: this.indent,
      source: this.source
    };
    return st;
  }
  *step() {
    const top = this.peek(1);
    if (this.type === "doc-end" && top?.type !== "doc-end") {
      while (this.stack.length > 0)
        yield* this.pop();
      this.stack.push({
        type: "doc-end",
        offset: this.offset,
        source: this.source
      });
      return;
    }
    if (!top)
      return yield* this.stream();
    switch (top.type) {
      case "document":
        return yield* this.document(top);
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return yield* this.scalar(top);
      case "block-scalar":
        return yield* this.blockScalar(top);
      case "block-map":
        return yield* this.blockMap(top);
      case "block-seq":
        return yield* this.blockSequence(top);
      case "flow-collection":
        return yield* this.flowCollection(top);
      case "doc-end":
        return yield* this.documentEnd(top);
    }
    yield* this.pop();
  }
  peek(n) {
    return this.stack[this.stack.length - n];
  }
  *pop(error) {
    const token = error ?? this.stack.pop();
    if (!token) {
      const message = "Tried to pop an empty stack";
      yield { type: "error", offset: this.offset, source: "", message };
    } else if (this.stack.length === 0) {
      yield token;
    } else {
      const top = this.peek(1);
      if (token.type === "block-scalar") {
        token.indent = "indent" in top ? top.indent : 0;
      } else if (token.type === "flow-collection" && top.type === "document") {
        token.indent = 0;
      }
      if (token.type === "flow-collection")
        fixFlowSeqItems(token);
      switch (top.type) {
        case "document":
          top.value = token;
          break;
        case "block-scalar":
          top.props.push(token);
          break;
        case "block-map": {
          const it = top.items[top.items.length - 1];
          if (it.value) {
            top.items.push({ start: [], key: token, sep: [] });
            this.onKeyLine = true;
            return;
          } else if (it.sep) {
            it.value = token;
          } else {
            Object.assign(it, { key: token, sep: [] });
            this.onKeyLine = !it.explicitKey;
            return;
          }
          break;
        }
        case "block-seq": {
          const it = top.items[top.items.length - 1];
          if (it.value)
            top.items.push({ start: [], value: token });
          else
            it.value = token;
          break;
        }
        case "flow-collection": {
          const it = top.items[top.items.length - 1];
          if (!it || it.value)
            top.items.push({ start: [], key: token, sep: [] });
          else if (it.sep)
            it.value = token;
          else
            Object.assign(it, { key: token, sep: [] });
          return;
        }
        /* istanbul ignore next should not happen */
        default:
          yield* this.pop();
          yield* this.pop(token);
      }
      if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
        const last = token.items[token.items.length - 1];
        if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
          if (top.type === "document")
            top.end = last.start;
          else
            top.items.push({ start: last.start });
          token.items.splice(-1, 1);
        }
      }
    }
  }
  *stream() {
    switch (this.type) {
      case "directive-line":
        yield { type: "directive", offset: this.offset, source: this.source };
        return;
      case "byte-order-mark":
      case "space":
      case "comment":
      case "newline":
        yield this.sourceToken;
        return;
      case "doc-mode":
      case "doc-start": {
        const doc = {
          type: "document",
          offset: this.offset,
          start: []
        };
        if (this.type === "doc-start")
          doc.start.push(this.sourceToken);
        this.stack.push(doc);
        return;
      }
    }
    yield {
      type: "error",
      offset: this.offset,
      message: `Unexpected ${this.type} token in YAML stream`,
      source: this.source
    };
  }
  *document(doc) {
    if (doc.value)
      return yield* this.lineEnd(doc);
    switch (this.type) {
      case "doc-start": {
        if (findNonEmptyIndex(doc.start) !== -1) {
          yield* this.pop();
          yield* this.step();
        } else
          doc.start.push(this.sourceToken);
        return;
      }
      case "anchor":
      case "tag":
      case "space":
      case "comment":
      case "newline":
        doc.start.push(this.sourceToken);
        return;
    }
    const bv = this.startBlockValue(doc);
    if (bv)
      this.stack.push(bv);
    else {
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML document`,
        source: this.source
      };
    }
  }
  *scalar(scalar2) {
    if (this.type === "map-value-ind") {
      const prev = getPrevProps(this.peek(2));
      const start = getFirstKeyStartProps(prev);
      let sep;
      if (scalar2.end) {
        sep = scalar2.end;
        sep.push(this.sourceToken);
        delete scalar2.end;
      } else
        sep = [this.sourceToken];
      const map2 = {
        type: "block-map",
        offset: scalar2.offset,
        indent: scalar2.indent,
        items: [{ start, key: scalar2, sep }]
      };
      this.onKeyLine = true;
      this.stack[this.stack.length - 1] = map2;
    } else
      yield* this.lineEnd(scalar2);
  }
  *blockScalar(scalar2) {
    switch (this.type) {
      case "space":
      case "comment":
      case "newline":
        scalar2.props.push(this.sourceToken);
        return;
      case "scalar":
        scalar2.source = this.source;
        this.atNewLine = true;
        this.indent = 0;
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        yield* this.pop();
        break;
      /* istanbul ignore next should not happen */
      default:
        yield* this.pop();
        yield* this.step();
    }
  }
  *blockMap(map2) {
    const it = map2.items[map2.items.length - 1];
    switch (this.type) {
      case "newline":
        this.onKeyLine = false;
        if (it.value) {
          const end = "end" in it.value ? it.value.end : void 0;
          const last = Array.isArray(end) ? end[end.length - 1] : void 0;
          if (last?.type === "comment")
            end?.push(this.sourceToken);
          else
            map2.items.push({ start: [this.sourceToken] });
        } else if (it.sep) {
          it.sep.push(this.sourceToken);
        } else {
          it.start.push(this.sourceToken);
        }
        return;
      case "space":
      case "comment":
        if (it.value) {
          map2.items.push({ start: [this.sourceToken] });
        } else if (it.sep) {
          it.sep.push(this.sourceToken);
        } else {
          if (this.atIndentedComment(it.start, map2.indent)) {
            const prev = map2.items[map2.items.length - 2];
            const end = prev?.value?.end;
            if (Array.isArray(end)) {
              arrayPushArray(end, it.start);
              end.push(this.sourceToken);
              map2.items.pop();
              return;
            }
          }
          it.start.push(this.sourceToken);
        }
        return;
    }
    if (this.indent >= map2.indent) {
      const atMapIndent = !this.onKeyLine && this.indent === map2.indent;
      const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
      let start = [];
      if (atNextItem && it.sep && !it.value) {
        const nl = [];
        for (let i = 0; i < it.sep.length; ++i) {
          const st = it.sep[i];
          switch (st.type) {
            case "newline":
              nl.push(i);
              break;
            case "space":
              break;
            case "comment":
              if (st.indent > map2.indent)
                nl.length = 0;
              break;
            default:
              nl.length = 0;
          }
        }
        if (nl.length >= 2)
          start = it.sep.splice(nl[1]);
      }
      switch (this.type) {
        case "anchor":
        case "tag":
          if (atNextItem || it.value) {
            start.push(this.sourceToken);
            map2.items.push({ start });
            this.onKeyLine = true;
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "explicit-key-ind":
          if (!it.sep && !it.explicitKey) {
            it.start.push(this.sourceToken);
            it.explicitKey = true;
          } else if (atNextItem || it.value) {
            start.push(this.sourceToken);
            map2.items.push({ start, explicitKey: true });
          } else {
            this.stack.push({
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken], explicitKey: true }]
            });
          }
          this.onKeyLine = true;
          return;
        case "map-value-ind":
          if (it.explicitKey) {
            if (!it.sep) {
              if (includesToken(it.start, "newline")) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else {
                const start2 = getFirstKeyStartProps(it.start);
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                });
              }
            } else if (it.value) {
              map2.items.push({ start: [], key: null, sep: [this.sourceToken] });
            } else if (includesToken(it.sep, "map-value-ind")) {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start, key: null, sep: [this.sourceToken] }]
              });
            } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
              const start2 = getFirstKeyStartProps(it.start);
              const key = it.key;
              const sep = it.sep;
              sep.push(this.sourceToken);
              delete it.key;
              delete it.sep;
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: start2, key, sep }]
              });
            } else if (start.length > 0) {
              it.sep = it.sep.concat(start, this.sourceToken);
            } else {
              it.sep.push(this.sourceToken);
            }
          } else {
            if (!it.sep) {
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            } else if (it.value || atNextItem) {
              map2.items.push({ start, key: null, sep: [this.sourceToken] });
            } else if (includesToken(it.sep, "map-value-ind")) {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [], key: null, sep: [this.sourceToken] }]
              });
            } else {
              it.sep.push(this.sourceToken);
            }
          }
          this.onKeyLine = true;
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const fs = this.flowScalar(this.type);
          if (atNextItem || it.value) {
            map2.items.push({ start, key: fs, sep: [] });
            this.onKeyLine = true;
          } else if (it.sep) {
            this.stack.push(fs);
          } else {
            Object.assign(it, { key: fs, sep: [] });
            this.onKeyLine = true;
          }
          return;
        }
        default: {
          const bv = this.startBlockValue(map2);
          if (bv) {
            if (bv.type === "block-seq") {
              if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                yield* this.pop({
                  type: "error",
                  offset: this.offset,
                  message: "Unexpected block-seq-ind on same line with key",
                  source: this.source
                });
                return;
              }
            } else if (atMapIndent) {
              map2.items.push({ start });
            }
            this.stack.push(bv);
            return;
          }
        }
      }
    }
    yield* this.pop();
    yield* this.step();
  }
  *blockSequence(seq2) {
    const it = seq2.items[seq2.items.length - 1];
    switch (this.type) {
      case "newline":
        if (it.value) {
          const end = "end" in it.value ? it.value.end : void 0;
          const last = Array.isArray(end) ? end[end.length - 1] : void 0;
          if (last?.type === "comment")
            end?.push(this.sourceToken);
          else
            seq2.items.push({ start: [this.sourceToken] });
        } else
          it.start.push(this.sourceToken);
        return;
      case "space":
      case "comment":
        if (it.value)
          seq2.items.push({ start: [this.sourceToken] });
        else {
          if (this.atIndentedComment(it.start, seq2.indent)) {
            const prev = seq2.items[seq2.items.length - 2];
            const end = prev?.value?.end;
            if (Array.isArray(end)) {
              arrayPushArray(end, it.start);
              end.push(this.sourceToken);
              seq2.items.pop();
              return;
            }
          }
          it.start.push(this.sourceToken);
        }
        return;
      case "anchor":
      case "tag":
        if (it.value || this.indent <= seq2.indent)
          break;
        it.start.push(this.sourceToken);
        return;
      case "seq-item-ind":
        if (this.indent !== seq2.indent)
          break;
        if (it.value || includesToken(it.start, "seq-item-ind"))
          seq2.items.push({ start: [this.sourceToken] });
        else
          it.start.push(this.sourceToken);
        return;
    }
    if (this.indent > seq2.indent) {
      const bv = this.startBlockValue(seq2);
      if (bv) {
        this.stack.push(bv);
        return;
      }
    }
    yield* this.pop();
    yield* this.step();
  }
  *flowCollection(fc) {
    const it = fc.items[fc.items.length - 1];
    if (this.type === "flow-error-end") {
      let top;
      do {
        yield* this.pop();
        top = this.peek(1);
      } while (top?.type === "flow-collection");
    } else if (fc.end.length === 0) {
      switch (this.type) {
        case "comma":
        case "explicit-key-ind":
          if (!it || it.sep)
            fc.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
        case "map-value-ind":
          if (!it || it.value)
            fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
          else if (it.sep)
            it.sep.push(this.sourceToken);
          else
            Object.assign(it, { key: null, sep: [this.sourceToken] });
          return;
        case "space":
        case "comment":
        case "newline":
        case "anchor":
        case "tag":
          if (!it || it.value)
            fc.items.push({ start: [this.sourceToken] });
          else if (it.sep)
            it.sep.push(this.sourceToken);
          else
            it.start.push(this.sourceToken);
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const fs = this.flowScalar(this.type);
          if (!it || it.value)
            fc.items.push({ start: [], key: fs, sep: [] });
          else if (it.sep)
            this.stack.push(fs);
          else
            Object.assign(it, { key: fs, sep: [] });
          return;
        }
        case "flow-map-end":
        case "flow-seq-end":
          fc.end.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(fc);
      if (bv)
        this.stack.push(bv);
      else {
        yield* this.pop();
        yield* this.step();
      }
    } else {
      const parent = this.peek(2);
      if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
        yield* this.pop();
        yield* this.step();
      } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
        const prev = getPrevProps(parent);
        const start = getFirstKeyStartProps(prev);
        fixFlowSeqItems(fc);
        const sep = fc.end.splice(1, fc.end.length);
        sep.push(this.sourceToken);
        const map2 = {
          type: "block-map",
          offset: fc.offset,
          indent: fc.indent,
          items: [{ start, key: fc, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map2;
      } else {
        yield* this.lineEnd(fc);
      }
    }
  }
  flowScalar(type) {
    if (this.onNewLine) {
      let nl = this.source.indexOf("\n") + 1;
      while (nl !== 0) {
        this.onNewLine(this.offset + nl);
        nl = this.source.indexOf("\n", nl) + 1;
      }
    }
    return {
      type,
      offset: this.offset,
      indent: this.indent,
      source: this.source
    };
  }
  startBlockValue(parent) {
    switch (this.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return this.flowScalar(this.type);
      case "block-scalar-header":
        return {
          type: "block-scalar",
          offset: this.offset,
          indent: this.indent,
          props: [this.sourceToken],
          source: ""
        };
      case "flow-map-start":
      case "flow-seq-start":
        return {
          type: "flow-collection",
          offset: this.offset,
          indent: this.indent,
          start: this.sourceToken,
          items: [],
          end: []
        };
      case "seq-item-ind":
        return {
          type: "block-seq",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: [this.sourceToken] }]
        };
      case "explicit-key-ind": {
        this.onKeyLine = true;
        const prev = getPrevProps(parent);
        const start = getFirstKeyStartProps(prev);
        start.push(this.sourceToken);
        return {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start, explicitKey: true }]
        };
      }
      case "map-value-ind": {
        this.onKeyLine = true;
        const prev = getPrevProps(parent);
        const start = getFirstKeyStartProps(prev);
        return {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start, key: null, sep: [this.sourceToken] }]
        };
      }
    }
    return null;
  }
  atIndentedComment(start, indent) {
    if (this.type !== "comment")
      return false;
    if (this.indent <= indent)
      return false;
    return start.every((st) => st.type === "newline" || st.type === "space");
  }
  *documentEnd(docEnd) {
    if (this.type !== "doc-mode") {
      if (docEnd.end)
        docEnd.end.push(this.sourceToken);
      else
        docEnd.end = [this.sourceToken];
      if (this.type === "newline")
        yield* this.pop();
    }
  }
  *lineEnd(token) {
    switch (this.type) {
      case "comma":
      case "doc-start":
      case "doc-end":
      case "flow-seq-end":
      case "flow-map-end":
      case "map-value-ind":
        yield* this.pop();
        yield* this.step();
        break;
      case "newline":
        this.onKeyLine = false;
      // fallthrough
      case "space":
      case "comment":
      default:
        if (token.end)
          token.end.push(this.sourceToken);
        else
          token.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
    }
  }
};

// node_modules/yaml/browser/dist/public-api.js
function parseOptions(options) {
  const prettyErrors = options.prettyErrors !== false;
  const lineCounter = options.lineCounter || prettyErrors && new LineCounter() || null;
  return { lineCounter, prettyErrors };
}
function parseDocument(source, options = {}) {
  const { lineCounter, prettyErrors } = parseOptions(options);
  const parser = new Parser(lineCounter?.addNewLine);
  const composer = new Composer(options);
  let doc = null;
  for (const _doc of composer.compose(parser.parse(source), true, source.length)) {
    if (!doc)
      doc = _doc;
    else if (doc.options.logLevel !== "silent") {
      doc.errors.push(new YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
      break;
    }
  }
  if (prettyErrors && lineCounter) {
    doc.errors.forEach(prettifyError(source, lineCounter));
    doc.warnings.forEach(prettifyError(source, lineCounter));
  }
  return doc;
}

// src/parsers/link-reference.ts
var WRAPPED = /^\[\[([^\[\]]+)\]\]$/;
var URI_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
var ABS_RE = /^([a-z]:[\\/]|[\\/]|~\/?)/i;
function validateInternalLinkTarget(inner) {
  const trimmed = inner.trim();
  if (!trimmed || trimmed.includes("[") || trimmed.includes("]")) return false;
  if (URI_RE.test(trimmed)) return false;
  if (ABS_RE.test(trimmed)) return false;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("file:")) return false;
  return true;
}
function parseWikilink(raw) {
  let inner = raw.trim();
  const direct = WRAPPED.exec(inner);
  if (direct) inner = direct[1].trim();
  if (!validateInternalLinkTarget(inner)) return null;
  let target = inner;
  let alias;
  const bar = inner.indexOf("|");
  if (bar >= 0) {
    alias = inner.slice(bar + 1).trim() || void 0;
    target = inner.slice(0, bar);
  }
  let heading;
  let block;
  const hash = target.indexOf("#");
  const caret = target.indexOf("^");
  if (caret >= 0 && (hash < 0 || caret < hash)) {
    block = target.slice(caret + 1).trim() || void 0;
    target = target.slice(0, caret);
  } else if (hash >= 0) {
    heading = target.slice(hash + 1).trim() || void 0;
    target = target.slice(0, hash);
  }
  const targetName = target.trim();
  if (!targetName || targetName.includes("\n")) return null;
  return { raw: inner, targetName, alias, heading, block };
}
function resolveLink(link, candidatePaths) {
  const wanted = link.targetName;
  const exact = candidatePaths.filter((p) => p === wanted || p === wanted + ".md");
  if (exact.length === 1) return { state: "RESOLVED", paths: exact };
  if (exact.length > 1) return { state: "AMBIGUOUS", paths: exact };
  const byName = candidatePaths.filter(
    (p) => p.endsWith("/" + wanted + ".md") || p.endsWith("/" + wanted)
  );
  if (byName.length === 1) return { state: "RESOLVED", paths: byName };
  if (byName.length > 1) return { state: "AMBIGUOUS", paths: byName };
  return { state: "BROKEN", paths: [] };
}

// src/parsers/frontmatter-parser.ts
var DELIMITER = /^---\r?$/;
var FM_WIKILINK = /^\[\[([^\[\]\n]+)\]\]$/;
function parseFrontmatterWikilink(raw) {
  const m = FM_WIKILINK.exec(raw.trim());
  if (m === null) return null;
  if (!validateInternalLinkTarget(m[1])) return null;
  let target = m[1];
  let alias;
  const bar = target.indexOf("|");
  if (bar >= 0) {
    alias = target.slice(bar + 1).trim() || void 0;
    target = target.slice(0, bar);
  }
  let heading;
  let block;
  const hash = target.indexOf("#");
  const caret = target.indexOf("^");
  if (caret >= 0 && (hash < 0 || caret < hash)) {
    block = target.slice(caret + 1).trim() || void 0;
    target = target.slice(0, caret);
  } else if (hash >= 0) {
    heading = target.slice(hash + 1).trim() || void 0;
    target = target.slice(0, hash);
  }
  const targetName = target.trim();
  if (!targetName) return null;
  return { raw: m[1], targetName, alias, heading, block };
}
function splitFrontmatter(content3) {
  let offset = 0;
  if (content3.charCodeAt(0) === 65279) offset = 1;
  const body = content3.slice(offset);
  const firstLineEnd = body.indexOf("\n");
  if (firstLineEnd < 0) return null;
  if (!DELIMITER.test(body.slice(0, firstLineEnd))) return null;
  const rest = body.slice(firstLineEnd + 1);
  const lines = rest.split("\n");
  let consumed = firstLineEnd + 1;
  for (let i = 0; i < lines.length; i++) {
    if (DELIMITER.test(lines[i])) {
      const end = offset + consumed + lines[i].length + 1;
      const text3 = body.slice(0, consumed + lines[i].length + 1);
      return { text: (offset > 0 ? content3[0] : "") + text3, start: 0, end };
    }
    consumed += lines[i].length + 1;
  }
  return null;
}
function refuseConstructs(doc, diagnostics, path) {
  const visit3 = (node2, isMappingKey) => {
    if (node2 === null || node2 === void 0) return;
    if (isAlias(node2)) {
      diagnostics.push({
        code: "frontmatter-alias",
        message: "YAML aliases are not supported in RD frontmatter",
        path
      });
      return;
    }
    const anyNode = node2;
    if (anyNode.anchor) {
      diagnostics.push({
        code: "frontmatter-anchor",
        message: "YAML anchors are not supported in RD frontmatter",
        path
      });
    }
    if (typeof anyNode.tag === "string" && anyNode.tag.startsWith("!")) {
      diagnostics.push({
        code: "frontmatter-tag",
        message: `custom YAML tag not supported: ${anyNode.tag}`,
        path
      });
    }
    if (isMappingKey && isScalar(node2)) {
      const val = String(node2.value);
      if (val === "<<") {
        diagnostics.push({
          code: "frontmatter-merge-key",
          message: "YAML merge key (<<) is not supported",
          path
        });
      }
    }
    if (isMap(node2)) {
      for (const pair of node2.items) {
        visit3(pair.key, true);
        visit3(pair.value, false);
      }
    } else if (isSeq(node2)) {
      for (const item of node2.items) visit3(item, false);
    }
  };
  visit3(doc.contents, false);
}
function parseFrontmatter(content3, path) {
  const diagnostics = [];
  const relations = [];
  const block = splitFrontmatter(content3);
  if (block === null) {
    return { fields: {}, relations, fileSuppressed: false, diagnostics };
  }
  let doc;
  try {
    doc = parseDocument(block.text, {
      strict: true,
      merge: false,
      schema: "core",
      logLevel: "silent"
    });
  } catch (err) {
    diagnostics.push({
      code: "frontmatter-invalid-yaml",
      message: `invalid YAML: ${err.message.split("\n")[0]}`,
      path
    });
    return { fields: {}, relations, fileSuppressed: true, diagnostics };
  }
  if (doc.errors.length > 0 || doc.warnings.length > 0) {
    const first = doc.errors[0]?.message ?? doc.warnings[0]?.message ?? "unknown";
    diagnostics.push({
      code: "frontmatter-invalid-yaml",
      message: first.split("\n")[0],
      path
    });
    return { fields: {}, relations, fileSuppressed: true, diagnostics };
  }
  refuseConstructs(doc, diagnostics, path);
  if (diagnostics.length > 0) {
    const fields2 = {};
    const root2 = doc.contents;
    if (isMap(root2)) {
      for (const pair of root2.items) {
        const keyNode = pair.key;
        const key = keyNode === null ? "" : String(keyNode);
        const value = pair.value ? pair.value.toJSON() : null;
        fields2[key] = value;
      }
    }
    return { fields: fields2, relations: [], fileSuppressed: true, diagnostics };
  }
  const fields = {};
  const root = doc.contents;
  if (isMap(root)) {
    for (const pair of root.items) {
      const keyNode = pair.key;
      const key = keyNode === null ? "" : String(keyNode);
      if (key in fields) {
        diagnostics.push({
          code: "frontmatter-duplicate-key",
          message: `duplicate key: ${key}`,
          path
        });
        continue;
      }
      const value = pair.value ? pair.value.toJSON() : null;
      fields[key] = value;
    }
  } else if (root !== null) {
    diagnostics.push({
      code: "frontmatter-not-a-map",
      message: "frontmatter must be a mapping",
      path
    });
  }
  if (diagnostics.length > 0) {
    return { fields, relations: [], fileSuppressed: true, diagnostics };
  }
  let anyRelationFieldError = false;
  for (const predicate of FRONTMATTER_RELATION_FIELDS) {
    if (!(predicate in fields)) continue;
    const value = fields[predicate];
    const items = Array.isArray(value) ? value : [value];
    const collected = [];
    for (const item of items) {
      if (item === null || item === void 0) continue;
      if (typeof item !== "string") {
        anyRelationFieldError = true;
        diagnostics.push({
          code: "frontmatter-relation-type",
          message: `field ${predicate} must be "[[target]]" strings or lists thereof`,
          path
        });
        continue;
      }
      const link = parseFrontmatterWikilink(item);
      if (link === null) {
        anyRelationFieldError = true;
        diagnostics.push({
          code: "frontmatter-relation-type",
          message: `field ${predicate} value is not a wikilink: ${item}`,
          path
        });
        continue;
      }
      collected.push({ predicate, link, rawValue: item });
    }
    if (!anyRelationFieldError) relations.push(...collected);
  }
  return {
    fields,
    relations: anyRelationFieldError ? [] : relations,
    fileSuppressed: anyRelationFieldError,
    diagnostics
  };
}

// node_modules/mdast-util-to-string/lib/index.js
var emptyOptions = {};
function toString(value, options) {
  const settings = options || emptyOptions;
  const includeImageAlt = typeof settings.includeImageAlt === "boolean" ? settings.includeImageAlt : true;
  const includeHtml = typeof settings.includeHtml === "boolean" ? settings.includeHtml : true;
  return one(value, includeImageAlt, includeHtml);
}
function one(value, includeImageAlt, includeHtml) {
  if (node(value)) {
    if ("value" in value) {
      return value.type === "html" && !includeHtml ? "" : value.value;
    }
    if (includeImageAlt && "alt" in value && value.alt) {
      return value.alt;
    }
    if ("children" in value) {
      return all(value.children, includeImageAlt, includeHtml);
    }
  }
  if (Array.isArray(value)) {
    return all(value, includeImageAlt, includeHtml);
  }
  return "";
}
function all(values, includeImageAlt, includeHtml) {
  const result = [];
  let index2 = -1;
  while (++index2 < values.length) {
    result[index2] = one(values[index2], includeImageAlt, includeHtml);
  }
  return result.join("");
}
function node(value) {
  return Boolean(value && typeof value === "object");
}

// node_modules/decode-named-character-reference/index.dom.js
var element = document.createElement("i");
function decodeNamedCharacterReference(value) {
  const characterReference2 = "&" + value + ";";
  element.innerHTML = characterReference2;
  const character = element.textContent;
  if (character.charCodeAt(character.length - 1) === 59 && value !== "semi") {
    return false;
  }
  return character === characterReference2 ? false : character;
}

// node_modules/micromark-util-chunked/index.js
function splice(list2, start, remove, items) {
  const end = list2.length;
  let chunkStart = 0;
  let parameters;
  if (start < 0) {
    start = -start > end ? 0 : end + start;
  } else {
    start = start > end ? end : start;
  }
  remove = remove > 0 ? remove : 0;
  if (items.length < 1e4) {
    parameters = Array.from(items);
    parameters.unshift(start, remove);
    list2.splice(...parameters);
  } else {
    if (remove) list2.splice(start, remove);
    while (chunkStart < items.length) {
      parameters = items.slice(chunkStart, chunkStart + 1e4);
      parameters.unshift(start, 0);
      list2.splice(...parameters);
      chunkStart += 1e4;
      start += 1e4;
    }
  }
}
function push(list2, items) {
  if (list2.length > 0) {
    splice(list2, list2.length, 0, items);
    return list2;
  }
  return items;
}

// node_modules/micromark-util-combine-extensions/index.js
var hasOwnProperty = {}.hasOwnProperty;
function combineExtensions(extensions) {
  const all2 = {};
  let index2 = -1;
  while (++index2 < extensions.length) {
    syntaxExtension(all2, extensions[index2]);
  }
  return all2;
}
function syntaxExtension(all2, extension2) {
  let hook;
  for (hook in extension2) {
    const maybe = hasOwnProperty.call(all2, hook) ? all2[hook] : void 0;
    const left = maybe || (all2[hook] = {});
    const right = extension2[hook];
    let code;
    if (right) {
      for (code in right) {
        if (!hasOwnProperty.call(left, code)) left[code] = [];
        const value = right[code];
        constructs(
          // @ts-expect-error Looks like a list.
          left[code],
          Array.isArray(value) ? value : value ? [value] : []
        );
      }
    }
  }
}
function constructs(existing, list2) {
  let index2 = -1;
  const before = [];
  while (++index2 < list2.length) {
    ;
    (list2[index2].add === "after" ? existing : before).push(list2[index2]);
  }
  splice(existing, 0, 0, before);
}

// node_modules/micromark-util-decode-numeric-character-reference/index.js
function decodeNumericCharacterReference(value, base) {
  const code = Number.parseInt(value, base);
  if (
    // C0 except for HT, LF, FF, CR, space.
    code < 9 || code === 11 || code > 13 && code < 32 || // Control character (DEL) of C0, and C1 controls.
    code > 126 && code < 160 || // Lone high surrogates and low surrogates.
    code > 55295 && code < 57344 || // Noncharacters.
    code > 64975 && code < 65008 || /* eslint-disable no-bitwise */
    (code & 65535) === 65535 || (code & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    code > 1114111
  ) {
    return "\uFFFD";
  }
  return String.fromCodePoint(code);
}

// node_modules/micromark-util-normalize-identifier/index.js
function normalizeIdentifier(value) {
  return value.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}

// node_modules/micromark-util-character/index.js
var asciiAlpha = regexCheck(/[A-Za-z]/);
var asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
var asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
function asciiControl(code) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    code !== null && (code < 32 || code === 127)
  );
}
var asciiDigit = regexCheck(/\d/);
var asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
var asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
function markdownLineEnding(code) {
  return code !== null && code < -2;
}
function markdownLineEndingOrSpace(code) {
  return code !== null && (code < 0 || code === 32);
}
function markdownSpace(code) {
  return code === -2 || code === -1 || code === 32;
}
var unicodePunctuation = regexCheck(/\p{P}|\p{S}/u);
var unicodeWhitespace = regexCheck(/\s/);
function regexCheck(regex) {
  return check;
  function check(code) {
    return code !== null && code > -1 && regex.test(String.fromCharCode(code));
  }
}

// node_modules/micromark-factory-space/index.js
function factorySpace(effects, ok, type, max) {
  const limit = max ? max - 1 : Number.POSITIVE_INFINITY;
  let size = 0;
  return start;
  function start(code) {
    if (markdownSpace(code)) {
      effects.enter(type);
      return prefix(code);
    }
    return ok(code);
  }
  function prefix(code) {
    if (markdownSpace(code) && size++ < limit) {
      effects.consume(code);
      return prefix;
    }
    effects.exit(type);
    return ok(code);
  }
}

// node_modules/micromark/lib/initialize/content.js
var content = {
  tokenize: initializeContent
};
function initializeContent(effects) {
  const contentStart = effects.attempt(this.parser.constructs.contentInitial, afterContentStartConstruct, paragraphInitial);
  let previous2;
  return contentStart;
  function afterContentStartConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, contentStart, "linePrefix");
  }
  function paragraphInitial(code) {
    effects.enter("paragraph");
    return lineStart(code);
  }
  function lineStart(code) {
    const token = effects.enter("chunkText", {
      contentType: "text",
      previous: previous2
    });
    if (previous2) {
      previous2.next = token;
    }
    previous2 = token;
    return data(code);
  }
  function data(code) {
    if (code === null) {
      effects.exit("chunkText");
      effects.exit("paragraph");
      effects.consume(code);
      return;
    }
    if (markdownLineEnding(code)) {
      effects.consume(code);
      effects.exit("chunkText");
      return lineStart;
    }
    effects.consume(code);
    return data;
  }
}

// node_modules/micromark/lib/initialize/document.js
var document2 = {
  tokenize: initializeDocument
};
var containerConstruct = {
  tokenize: tokenizeContainer
};
function initializeDocument(effects) {
  const self = this;
  const stack = [];
  let continued = 0;
  let childFlow;
  let childToken;
  let lineStartOffset;
  return start;
  function start(code) {
    if (continued < stack.length) {
      const item = stack[continued];
      self.containerState = item[1];
      return effects.attempt(item[0].continuation, documentContinue, checkNewContainers)(code);
    }
    return checkNewContainers(code);
  }
  function documentContinue(code) {
    continued++;
    if (self.containerState._closeFlow) {
      self.containerState._closeFlow = void 0;
      if (childFlow) {
        closeFlow();
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          point3 = self.events[indexBeforeFlow][1].end;
          break;
        }
      }
      exitContainers(continued);
      let index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      self.events.length = index2;
      return checkNewContainers(code);
    }
    return start(code);
  }
  function checkNewContainers(code) {
    if (continued === stack.length) {
      if (!childFlow) {
        return documentContinued(code);
      }
      if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) {
        return flowStart(code);
      }
      self.interrupt = Boolean(childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack);
    }
    self.containerState = {};
    return effects.check(containerConstruct, thereIsANewContainer, thereIsNoNewContainer)(code);
  }
  function thereIsANewContainer(code) {
    if (childFlow) closeFlow();
    exitContainers(continued);
    return documentContinued(code);
  }
  function thereIsNoNewContainer(code) {
    self.parser.lazy[self.now().line] = continued !== stack.length;
    lineStartOffset = self.now().offset;
    return flowStart(code);
  }
  function documentContinued(code) {
    self.containerState = {};
    return effects.attempt(containerConstruct, containerContinue, flowStart)(code);
  }
  function containerContinue(code) {
    continued++;
    stack.push([self.currentConstruct, self.containerState]);
    return documentContinued(code);
  }
  function flowStart(code) {
    if (code === null) {
      if (childFlow) closeFlow();
      exitContainers(0);
      effects.consume(code);
      return;
    }
    childFlow = childFlow || self.parser.flow(self.now());
    effects.enter("chunkFlow", {
      _tokenizer: childFlow,
      contentType: "flow",
      previous: childToken
    });
    return flowContinue(code);
  }
  function flowContinue(code) {
    if (code === null) {
      writeToChild(effects.exit("chunkFlow"), true);
      exitContainers(0);
      effects.consume(code);
      return;
    }
    if (markdownLineEnding(code)) {
      effects.consume(code);
      writeToChild(effects.exit("chunkFlow"));
      continued = 0;
      self.interrupt = void 0;
      return start;
    }
    effects.consume(code);
    return flowContinue;
  }
  function writeToChild(token, endOfFile) {
    const stream = self.sliceStream(token);
    if (endOfFile) stream.push(null);
    token.previous = childToken;
    if (childToken) childToken.next = token;
    childToken = token;
    childFlow.defineSkip(token.start);
    childFlow.write(stream);
    if (self.parser.lazy[token.start.line]) {
      let index2 = childFlow.events.length;
      while (index2--) {
        if (
          // The token starts before the line ending…
          childFlow.events[index2][1].start.offset < lineStartOffset && // …and either is not ended yet…
          (!childFlow.events[index2][1].end || // …or ends after it.
          childFlow.events[index2][1].end.offset > lineStartOffset)
        ) {
          return;
        }
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let seen;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          if (seen) {
            point3 = self.events[indexBeforeFlow][1].end;
            break;
          }
          seen = true;
        }
      }
      exitContainers(continued);
      index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      self.events.length = index2;
    }
  }
  function exitContainers(size) {
    let index2 = stack.length;
    while (index2-- > size) {
      const entry2 = stack[index2];
      self.containerState = entry2[1];
      entry2[0].exit.call(self, effects);
    }
    stack.length = size;
  }
  function closeFlow() {
    childFlow.write([null]);
    childToken = void 0;
    childFlow = void 0;
    self.containerState._closeFlow = void 0;
  }
}
function tokenizeContainer(effects, ok, nok) {
  return factorySpace(effects, effects.attempt(this.parser.constructs.document, ok, nok), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}

// node_modules/micromark-util-classify-character/index.js
function classifyCharacter(code) {
  if (code === null || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
    return 1;
  }
  if (unicodePunctuation(code)) {
    return 2;
  }
}

// node_modules/micromark-util-resolve-all/index.js
function resolveAll(constructs2, events, context) {
  const called = [];
  let index2 = -1;
  while (++index2 < constructs2.length) {
    const resolve = constructs2[index2].resolveAll;
    if (resolve && !called.includes(resolve)) {
      events = resolve(events, context);
      called.push(resolve);
    }
  }
  return events;
}

// node_modules/micromark-core-commonmark/lib/attention.js
var attention = {
  name: "attention",
  resolveAll: resolveAllAttention,
  tokenize: tokenizeAttention
};
function resolveAllAttention(events, context) {
  let index2 = -1;
  let open;
  let group;
  let text3;
  let openingSequence;
  let closingSequence;
  let use;
  let nextEvents;
  let offset;
  while (++index2 < events.length) {
    if (events[index2][0] === "enter" && events[index2][1].type === "attentionSequence" && events[index2][1]._close) {
      open = index2;
      while (open--) {
        if (events[open][0] === "exit" && events[open][1].type === "attentionSequence" && events[open][1]._open && // If the markers are the same:
        context.sliceSerialize(events[open][1]).charCodeAt(0) === context.sliceSerialize(events[index2][1]).charCodeAt(0)) {
          if ((events[open][1]._close || events[index2][1]._open) && (events[index2][1].end.offset - events[index2][1].start.offset) % 3 && !((events[open][1].end.offset - events[open][1].start.offset + events[index2][1].end.offset - events[index2][1].start.offset) % 3)) {
            continue;
          }
          use = events[open][1].end.offset - events[open][1].start.offset > 1 && events[index2][1].end.offset - events[index2][1].start.offset > 1 ? 2 : 1;
          const start = {
            ...events[open][1].end
          };
          const end = {
            ...events[index2][1].start
          };
          movePoint(start, -use);
          movePoint(end, use);
          openingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start,
            end: {
              ...events[open][1].end
            }
          };
          closingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...events[index2][1].start
            },
            end
          };
          text3 = {
            type: use > 1 ? "strongText" : "emphasisText",
            start: {
              ...events[open][1].end
            },
            end: {
              ...events[index2][1].start
            }
          };
          group = {
            type: use > 1 ? "strong" : "emphasis",
            start: {
              ...openingSequence.start
            },
            end: {
              ...closingSequence.end
            }
          };
          events[open][1].end = {
            ...openingSequence.start
          };
          events[index2][1].start = {
            ...closingSequence.end
          };
          nextEvents = [];
          if (events[open][1].end.offset - events[open][1].start.offset) {
            nextEvents = push(nextEvents, [["enter", events[open][1], context], ["exit", events[open][1], context]]);
          }
          nextEvents = push(nextEvents, [["enter", group, context], ["enter", openingSequence, context], ["exit", openingSequence, context], ["enter", text3, context]]);
          nextEvents = push(nextEvents, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + 1, index2), context));
          nextEvents = push(nextEvents, [["exit", text3, context], ["enter", closingSequence, context], ["exit", closingSequence, context], ["exit", group, context]]);
          if (events[index2][1].end.offset - events[index2][1].start.offset) {
            offset = 2;
            nextEvents = push(nextEvents, [["enter", events[index2][1], context], ["exit", events[index2][1], context]]);
          } else {
            offset = 0;
          }
          splice(events, open - 1, index2 - open + 3, nextEvents);
          index2 = open + nextEvents.length - offset - 2;
          break;
        }
      }
    }
  }
  index2 = -1;
  while (++index2 < events.length) {
    if (events[index2][1].type === "attentionSequence") {
      events[index2][1].type = "data";
    }
  }
  return events;
}
function tokenizeAttention(effects, ok) {
  const attentionMarkers2 = this.parser.constructs.attentionMarkers.null;
  const previous2 = this.previous;
  const before = classifyCharacter(previous2);
  let marker;
  return start;
  function start(code) {
    marker = code;
    effects.enter("attentionSequence");
    return inside(code);
  }
  function inside(code) {
    if (code === marker) {
      effects.consume(code);
      return inside;
    }
    const token = effects.exit("attentionSequence");
    const after = classifyCharacter(code);
    const open = !after || after === 2 && before || attentionMarkers2.includes(code);
    const close = !before || before === 2 && after || attentionMarkers2.includes(previous2);
    token._open = Boolean(marker === 42 ? open : open && (before || !close));
    token._close = Boolean(marker === 42 ? close : close && (after || !open));
    return ok(code);
  }
}
function movePoint(point3, offset) {
  point3.column += offset;
  point3.offset += offset;
  point3._bufferIndex += offset;
}

// node_modules/micromark-core-commonmark/lib/autolink.js
var autolink = {
  name: "autolink",
  tokenize: tokenizeAutolink
};
function tokenizeAutolink(effects, ok, nok) {
  let size = 0;
  return start;
  function start(code) {
    effects.enter("autolink");
    effects.enter("autolinkMarker");
    effects.consume(code);
    effects.exit("autolinkMarker");
    effects.enter("autolinkProtocol");
    return open;
  }
  function open(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return schemeOrEmailAtext;
    }
    if (code === 64) {
      return nok(code);
    }
    return emailAtext(code);
  }
  function schemeOrEmailAtext(code) {
    if (code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) {
      size = 1;
      return schemeInsideOrEmailAtext(code);
    }
    return emailAtext(code);
  }
  function schemeInsideOrEmailAtext(code) {
    if (code === 58) {
      effects.consume(code);
      size = 0;
      return urlInside;
    }
    if ((code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) && size++ < 32) {
      effects.consume(code);
      return schemeInsideOrEmailAtext;
    }
    size = 0;
    return emailAtext(code);
  }
  function urlInside(code) {
    if (code === 62) {
      effects.exit("autolinkProtocol");
      effects.enter("autolinkMarker");
      effects.consume(code);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok;
    }
    if (code === null || code === 32 || code === 60 || asciiControl(code)) {
      return nok(code);
    }
    effects.consume(code);
    return urlInside;
  }
  function emailAtext(code) {
    if (code === 64) {
      effects.consume(code);
      return emailAtSignOrDot;
    }
    if (asciiAtext(code)) {
      effects.consume(code);
      return emailAtext;
    }
    return nok(code);
  }
  function emailAtSignOrDot(code) {
    return asciiAlphanumeric(code) ? emailLabel(code) : nok(code);
  }
  function emailLabel(code) {
    if (code === 46) {
      effects.consume(code);
      size = 0;
      return emailAtSignOrDot;
    }
    if (code === 62) {
      effects.exit("autolinkProtocol").type = "autolinkEmail";
      effects.enter("autolinkMarker");
      effects.consume(code);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok;
    }
    return emailValue(code);
  }
  function emailValue(code) {
    if ((code === 45 || asciiAlphanumeric(code)) && size++ < 63) {
      const next = code === 45 ? emailValue : emailLabel;
      effects.consume(code);
      return next;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/blank-line.js
var blankLine = {
  partial: true,
  tokenize: tokenizeBlankLine
};
function tokenizeBlankLine(effects, ok, nok) {
  return start;
  function start(code) {
    return markdownSpace(code) ? factorySpace(effects, after, "linePrefix")(code) : after(code);
  }
  function after(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/block-quote.js
var blockQuote = {
  continuation: {
    tokenize: tokenizeBlockQuoteContinuation
  },
  exit,
  name: "blockQuote",
  tokenize: tokenizeBlockQuoteStart
};
function tokenizeBlockQuoteStart(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (code === 62) {
      const state = self.containerState;
      if (!state.open) {
        effects.enter("blockQuote", {
          _container: true
        });
        state.open = true;
      }
      effects.enter("blockQuotePrefix");
      effects.enter("blockQuoteMarker");
      effects.consume(code);
      effects.exit("blockQuoteMarker");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    if (markdownSpace(code)) {
      effects.enter("blockQuotePrefixWhitespace");
      effects.consume(code);
      effects.exit("blockQuotePrefixWhitespace");
      effects.exit("blockQuotePrefix");
      return ok;
    }
    effects.exit("blockQuotePrefix");
    return ok(code);
  }
}
function tokenizeBlockQuoteContinuation(effects, ok, nok) {
  const self = this;
  return contStart;
  function contStart(code) {
    if (markdownSpace(code)) {
      return factorySpace(effects, contBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
    }
    return contBefore(code);
  }
  function contBefore(code) {
    return effects.attempt(blockQuote, ok, nok)(code);
  }
}
function exit(effects) {
  effects.exit("blockQuote");
}

// node_modules/micromark-core-commonmark/lib/character-escape.js
var characterEscape = {
  name: "characterEscape",
  tokenize: tokenizeCharacterEscape
};
function tokenizeCharacterEscape(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("characterEscape");
    effects.enter("escapeMarker");
    effects.consume(code);
    effects.exit("escapeMarker");
    return inside;
  }
  function inside(code) {
    if (asciiPunctuation(code)) {
      effects.enter("characterEscapeValue");
      effects.consume(code);
      effects.exit("characterEscapeValue");
      effects.exit("characterEscape");
      return ok;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/character-reference.js
var characterReference = {
  name: "characterReference",
  tokenize: tokenizeCharacterReference
};
function tokenizeCharacterReference(effects, ok, nok) {
  const self = this;
  let size = 0;
  let max;
  let test;
  return start;
  function start(code) {
    effects.enter("characterReference");
    effects.enter("characterReferenceMarker");
    effects.consume(code);
    effects.exit("characterReferenceMarker");
    return open;
  }
  function open(code) {
    if (code === 35) {
      effects.enter("characterReferenceMarkerNumeric");
      effects.consume(code);
      effects.exit("characterReferenceMarkerNumeric");
      return numeric;
    }
    effects.enter("characterReferenceValue");
    max = 31;
    test = asciiAlphanumeric;
    return value(code);
  }
  function numeric(code) {
    if (code === 88 || code === 120) {
      effects.enter("characterReferenceMarkerHexadecimal");
      effects.consume(code);
      effects.exit("characterReferenceMarkerHexadecimal");
      effects.enter("characterReferenceValue");
      max = 6;
      test = asciiHexDigit;
      return value;
    }
    effects.enter("characterReferenceValue");
    max = 7;
    test = asciiDigit;
    return value(code);
  }
  function value(code) {
    if (code === 59 && size) {
      const token = effects.exit("characterReferenceValue");
      if (test === asciiAlphanumeric && !decodeNamedCharacterReference(self.sliceSerialize(token))) {
        return nok(code);
      }
      effects.enter("characterReferenceMarker");
      effects.consume(code);
      effects.exit("characterReferenceMarker");
      effects.exit("characterReference");
      return ok;
    }
    if (test(code) && size++ < max) {
      effects.consume(code);
      return value;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-fenced.js
var nonLazyContinuation = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation
};
var codeFenced = {
  concrete: true,
  name: "codeFenced",
  tokenize: tokenizeCodeFenced
};
function tokenizeCodeFenced(effects, ok, nok) {
  const self = this;
  const closeStart = {
    partial: true,
    tokenize: tokenizeCloseStart
  };
  let initialPrefix = 0;
  let sizeOpen = 0;
  let marker;
  return start;
  function start(code) {
    return beforeSequenceOpen(code);
  }
  function beforeSequenceOpen(code) {
    const tail = self.events[self.events.length - 1];
    initialPrefix = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
    marker = code;
    effects.enter("codeFenced");
    effects.enter("codeFencedFence");
    effects.enter("codeFencedFenceSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === marker) {
      sizeOpen++;
      effects.consume(code);
      return sequenceOpen;
    }
    if (sizeOpen < 3) {
      return nok(code);
    }
    effects.exit("codeFencedFenceSequence");
    return markdownSpace(code) ? factorySpace(effects, infoBefore, "whitespace")(code) : infoBefore(code);
  }
  function infoBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFencedFence");
      return self.interrupt ? ok(code) : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
    }
    effects.enter("codeFencedFenceInfo");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return info(code);
  }
  function info(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return infoBefore(code);
    }
    if (markdownSpace(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return factorySpace(effects, metaBefore, "whitespace")(code);
    }
    if (code === 96 && code === marker) {
      return nok(code);
    }
    effects.consume(code);
    return info;
  }
  function metaBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      return infoBefore(code);
    }
    effects.enter("codeFencedFenceMeta");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return meta(code);
  }
  function meta(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceMeta");
      return infoBefore(code);
    }
    if (code === 96 && code === marker) {
      return nok(code);
    }
    effects.consume(code);
    return meta;
  }
  function atNonLazyBreak(code) {
    return effects.attempt(closeStart, after, contentBefore)(code);
  }
  function contentBefore(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return contentStart;
  }
  function contentStart(code) {
    return initialPrefix > 0 && markdownSpace(code) ? factorySpace(effects, beforeContentChunk, "linePrefix", initialPrefix + 1)(code) : beforeContentChunk(code);
  }
  function beforeContentChunk(code) {
    if (code === null || markdownLineEnding(code)) {
      return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
    }
    effects.enter("codeFlowValue");
    return contentChunk(code);
  }
  function contentChunk(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFlowValue");
      return beforeContentChunk(code);
    }
    effects.consume(code);
    return contentChunk;
  }
  function after(code) {
    effects.exit("codeFenced");
    return ok(code);
  }
  function tokenizeCloseStart(effects2, ok2, nok2) {
    let size = 0;
    return startBefore;
    function startBefore(code) {
      effects2.enter("lineEnding");
      effects2.consume(code);
      effects2.exit("lineEnding");
      return start2;
    }
    function start2(code) {
      effects2.enter("codeFencedFence");
      return markdownSpace(code) ? factorySpace(effects2, beforeSequenceClose, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : beforeSequenceClose(code);
    }
    function beforeSequenceClose(code) {
      if (code === marker) {
        effects2.enter("codeFencedFenceSequence");
        return sequenceClose(code);
      }
      return nok2(code);
    }
    function sequenceClose(code) {
      if (code === marker) {
        size++;
        effects2.consume(code);
        return sequenceClose;
      }
      if (size >= sizeOpen) {
        effects2.exit("codeFencedFenceSequence");
        return markdownSpace(code) ? factorySpace(effects2, sequenceCloseAfter, "whitespace")(code) : sequenceCloseAfter(code);
      }
      return nok2(code);
    }
    function sequenceCloseAfter(code) {
      if (code === null || markdownLineEnding(code)) {
        effects2.exit("codeFencedFence");
        return ok2(code);
      }
      return nok2(code);
    }
  }
}
function tokenizeNonLazyContinuation(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (code === null) {
      return nok(code);
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return lineStart;
  }
  function lineStart(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-indented.js
var codeIndented = {
  name: "codeIndented",
  tokenize: tokenizeCodeIndented
};
var furtherStart = {
  partial: true,
  tokenize: tokenizeFurtherStart
};
function tokenizeCodeIndented(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    effects.enter("codeIndented");
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code);
  }
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? atBreak(code) : nok(code);
  }
  function atBreak(code) {
    if (code === null) {
      return after(code);
    }
    if (markdownLineEnding(code)) {
      return effects.attempt(furtherStart, atBreak, after)(code);
    }
    effects.enter("codeFlowValue");
    return inside(code);
  }
  function inside(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFlowValue");
      return atBreak(code);
    }
    effects.consume(code);
    return inside;
  }
  function after(code) {
    effects.exit("codeIndented");
    return ok(code);
  }
}
function tokenizeFurtherStart(effects, ok, nok) {
  const self = this;
  return furtherStart2;
  function furtherStart2(code) {
    if (self.parser.lazy[self.now().line]) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return furtherStart2;
    }
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code);
  }
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? ok(code) : markdownLineEnding(code) ? furtherStart2(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-text.js
var codeText = {
  name: "codeText",
  previous,
  resolve: resolveCodeText,
  tokenize: tokenizeCodeText
};
function resolveCodeText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index2;
  let enter;
  if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
    index2 = headEnterIndex;
    while (++index2 < tailExitIndex) {
      if (events[index2][1].type === "codeTextData") {
        events[headEnterIndex][1].type = "codeTextPadding";
        events[tailExitIndex][1].type = "codeTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }
  index2 = headEnterIndex - 1;
  tailExitIndex++;
  while (++index2 <= tailExitIndex) {
    if (enter === void 0) {
      if (index2 !== tailExitIndex && events[index2][1].type !== "lineEnding") {
        enter = index2;
      }
    } else if (index2 === tailExitIndex || events[index2][1].type === "lineEnding") {
      events[enter][1].type = "codeTextData";
      if (index2 !== enter + 2) {
        events[enter][1].end = events[index2 - 1][1].end;
        events.splice(enter + 2, index2 - enter - 2);
        tailExitIndex -= index2 - enter - 2;
        index2 = enter + 2;
      }
      enter = void 0;
    }
  }
  return events;
}
function previous(code) {
  return code !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function tokenizeCodeText(effects, ok, nok) {
  const self = this;
  let sizeOpen = 0;
  let size;
  let token;
  return start;
  function start(code) {
    effects.enter("codeText");
    effects.enter("codeTextSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === 96) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen;
    }
    effects.exit("codeTextSequence");
    return between(code);
  }
  function between(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 32) {
      effects.enter("space");
      effects.consume(code);
      effects.exit("space");
      return between;
    }
    if (code === 96) {
      token = effects.enter("codeTextSequence");
      size = 0;
      return sequenceClose(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return between;
    }
    effects.enter("codeTextData");
    return data(code);
  }
  function data(code) {
    if (code === null || code === 32 || code === 96 || markdownLineEnding(code)) {
      effects.exit("codeTextData");
      return between(code);
    }
    effects.consume(code);
    return data;
  }
  function sequenceClose(code) {
    if (code === 96) {
      effects.consume(code);
      size++;
      return sequenceClose;
    }
    if (size === sizeOpen) {
      effects.exit("codeTextSequence");
      effects.exit("codeText");
      return ok(code);
    }
    token.type = "codeTextData";
    return data(code);
  }
}

// node_modules/micromark-util-subtokenize/lib/splice-buffer.js
var SpliceBuffer = class {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(initial) {
    this.left = initial ? [...initial] : [];
    this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(index2) {
    if (index2 < 0 || index2 >= this.left.length + this.right.length) {
      throw new RangeError("Cannot access index `" + index2 + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    }
    if (index2 < this.left.length) return this.left[index2];
    return this.right[this.right.length - index2 + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    this.setCursor(0);
    return this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(start, end) {
    const stop = end === null || end === void 0 ? Number.POSITIVE_INFINITY : end;
    if (stop < this.left.length) {
      return this.left.slice(start, stop);
    }
    if (start > this.left.length) {
      return this.right.slice(this.right.length - stop + this.left.length, this.right.length - start + this.left.length).reverse();
    }
    return this.left.slice(start).concat(this.right.slice(this.right.length - stop + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(start, deleteCount, items) {
    const count = deleteCount || 0;
    this.setCursor(Math.trunc(start));
    const removed = this.right.splice(this.right.length - count, Number.POSITIVE_INFINITY);
    if (items) chunkedPush(this.left, items);
    return removed.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    this.setCursor(Number.POSITIVE_INFINITY);
    return this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(item) {
    this.setCursor(Number.POSITIVE_INFINITY);
    this.left.push(item);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(items) {
    this.setCursor(Number.POSITIVE_INFINITY);
    chunkedPush(this.left, items);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(item) {
    this.setCursor(0);
    this.right.push(item);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(items) {
    this.setCursor(0);
    chunkedPush(this.right, items.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(n) {
    if (n === this.left.length || n > this.left.length && this.right.length === 0 || n < 0 && this.left.length === 0) return;
    if (n < this.left.length) {
      const removed = this.left.splice(n, Number.POSITIVE_INFINITY);
      chunkedPush(this.right, removed.reverse());
    } else {
      const removed = this.right.splice(this.left.length + this.right.length - n, Number.POSITIVE_INFINITY);
      chunkedPush(this.left, removed.reverse());
    }
  }
};
function chunkedPush(list2, right) {
  let chunkStart = 0;
  if (right.length < 1e4) {
    list2.push(...right);
  } else {
    while (chunkStart < right.length) {
      list2.push(...right.slice(chunkStart, chunkStart + 1e4));
      chunkStart += 1e4;
    }
  }
}

// node_modules/micromark-util-subtokenize/index.js
function subtokenize(eventsArray) {
  const jumps = {};
  let index2 = -1;
  let event;
  let lineIndex;
  let otherIndex;
  let otherEvent;
  let parameters;
  let subevents;
  let more;
  const events = new SpliceBuffer(eventsArray);
  while (++index2 < events.length) {
    while (index2 in jumps) {
      index2 = jumps[index2];
    }
    event = events.get(index2);
    if (index2 && event[1].type === "chunkFlow" && events.get(index2 - 1)[1].type === "listItemPrefix") {
      subevents = event[1]._tokenizer.events;
      otherIndex = 0;
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "lineEndingBlank") {
        otherIndex += 2;
      }
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "content") {
        while (++otherIndex < subevents.length) {
          if (subevents[otherIndex][1].type === "content") {
            break;
          }
          if (subevents[otherIndex][1].type === "chunkText") {
            subevents[otherIndex][1]._isInFirstContentOfListItem = true;
            otherIndex++;
          }
        }
      }
    }
    if (event[0] === "enter") {
      if (event[1].contentType) {
        Object.assign(jumps, subcontent(events, index2));
        index2 = jumps[index2];
        more = true;
      }
    } else if (event[1]._container) {
      otherIndex = index2;
      lineIndex = void 0;
      while (otherIndex--) {
        otherEvent = events.get(otherIndex);
        if (otherEvent[1].type === "lineEnding" || otherEvent[1].type === "lineEndingBlank") {
          if (otherEvent[0] === "enter") {
            if (lineIndex) {
              events.get(lineIndex)[1].type = "lineEndingBlank";
            }
            otherEvent[1].type = "lineEnding";
            lineIndex = otherIndex;
          }
        } else if (otherEvent[1].type === "linePrefix" || otherEvent[1].type === "listItemIndent") {
        } else {
          break;
        }
      }
      if (lineIndex) {
        event[1].end = {
          ...events.get(lineIndex)[1].start
        };
        parameters = events.slice(lineIndex, index2);
        parameters.unshift(event);
        events.splice(lineIndex, index2 - lineIndex + 1, parameters);
      }
    }
  }
  splice(eventsArray, 0, Number.POSITIVE_INFINITY, events.slice(0));
  return !more;
}
function subcontent(events, eventIndex) {
  const token = events.get(eventIndex)[1];
  const context = events.get(eventIndex)[2];
  let startPosition = eventIndex - 1;
  const startPositions = [];
  let tokenizer = token._tokenizer;
  if (!tokenizer) {
    tokenizer = context.parser[token.contentType](token.start);
    if (token._contentTypeTextTrailing) {
      tokenizer._contentTypeTextTrailing = true;
    }
  }
  const childEvents = tokenizer.events;
  const jumps = [];
  const gaps = {};
  let stream;
  let previous2;
  let index2 = -1;
  let current = token;
  let adjust = 0;
  let start = 0;
  const breaks = [start];
  while (current) {
    while (events.get(++startPosition)[1] !== current) {
    }
    startPositions.push(startPosition);
    if (!current._tokenizer) {
      stream = context.sliceStream(current);
      if (!current.next) {
        stream.push(null);
      }
      if (previous2) {
        tokenizer.defineSkip(current.start);
      }
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = true;
      }
      tokenizer.write(stream);
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = void 0;
      }
    }
    previous2 = current;
    current = current.next;
  }
  current = token;
  while (++index2 < childEvents.length) {
    if (
      // Find a void token that includes a break.
      childEvents[index2][0] === "exit" && childEvents[index2 - 1][0] === "enter" && childEvents[index2][1].type === childEvents[index2 - 1][1].type && childEvents[index2][1].start.line !== childEvents[index2][1].end.line
    ) {
      start = index2 + 1;
      breaks.push(start);
      current._tokenizer = void 0;
      current.previous = void 0;
      current = current.next;
    }
  }
  tokenizer.events = [];
  if (current) {
    current._tokenizer = void 0;
    current.previous = void 0;
  } else {
    breaks.pop();
  }
  index2 = breaks.length;
  while (index2--) {
    const slice = childEvents.slice(breaks[index2], breaks[index2 + 1]);
    const start2 = startPositions.pop();
    jumps.push([start2, start2 + slice.length - 1]);
    events.splice(start2, 2, slice);
  }
  jumps.reverse();
  index2 = -1;
  while (++index2 < jumps.length) {
    gaps[adjust + jumps[index2][0]] = adjust + jumps[index2][1];
    adjust += jumps[index2][1] - jumps[index2][0] - 1;
  }
  return gaps;
}

// node_modules/micromark-core-commonmark/lib/content.js
var content2 = {
  resolve: resolveContent,
  tokenize: tokenizeContent
};
var continuationConstruct = {
  partial: true,
  tokenize: tokenizeContinuation
};
function resolveContent(events) {
  subtokenize(events);
  return events;
}
function tokenizeContent(effects, ok) {
  let previous2;
  return chunkStart;
  function chunkStart(code) {
    effects.enter("content");
    previous2 = effects.enter("chunkContent", {
      contentType: "content"
    });
    return chunkInside(code);
  }
  function chunkInside(code) {
    if (code === null) {
      return contentEnd(code);
    }
    if (markdownLineEnding(code)) {
      return effects.check(continuationConstruct, contentContinue, contentEnd)(code);
    }
    effects.consume(code);
    return chunkInside;
  }
  function contentEnd(code) {
    effects.exit("chunkContent");
    effects.exit("content");
    return ok(code);
  }
  function contentContinue(code) {
    effects.consume(code);
    effects.exit("chunkContent");
    previous2.next = effects.enter("chunkContent", {
      contentType: "content",
      previous: previous2
    });
    previous2 = previous2.next;
    return chunkInside;
  }
}
function tokenizeContinuation(effects, ok, nok) {
  const self = this;
  return startLookahead;
  function startLookahead(code) {
    effects.exit("chunkContent");
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, prefixed, "linePrefix");
  }
  function prefixed(code) {
    if (code === null || markdownLineEnding(code)) {
      return nok(code);
    }
    const tail = self.events[self.events.length - 1];
    if (!self.parser.constructs.disable.null.includes("codeIndented") && tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4) {
      return ok(code);
    }
    return effects.interrupt(self.parser.constructs.flow, nok, ok)(code);
  }
}

// node_modules/micromark-factory-destination/index.js
function factoryDestination(effects, ok, nok, type, literalType, literalMarkerType, rawType, stringType, max) {
  const limit = max || Number.POSITIVE_INFINITY;
  let balance = 0;
  return start;
  function start(code) {
    if (code === 60) {
      effects.enter(type);
      effects.enter(literalType);
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      return enclosedBefore;
    }
    if (code === null || code === 32 || code === 41 || asciiControl(code)) {
      return nok(code);
    }
    effects.enter(type);
    effects.enter(rawType);
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return raw(code);
  }
  function enclosedBefore(code) {
    if (code === 62) {
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      effects.exit(literalType);
      effects.exit(type);
      return ok;
    }
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return enclosed(code);
  }
  function enclosed(code) {
    if (code === 62) {
      effects.exit("chunkString");
      effects.exit(stringType);
      return enclosedBefore(code);
    }
    if (code === null || code === 60 || markdownLineEnding(code)) {
      return nok(code);
    }
    effects.consume(code);
    return code === 92 ? enclosedEscape : enclosed;
  }
  function enclosedEscape(code) {
    if (code === 60 || code === 62 || code === 92) {
      effects.consume(code);
      return enclosed;
    }
    return enclosed(code);
  }
  function raw(code) {
    if (!balance && (code === null || code === 41 || markdownLineEndingOrSpace(code))) {
      effects.exit("chunkString");
      effects.exit(stringType);
      effects.exit(rawType);
      effects.exit(type);
      return ok(code);
    }
    if (balance < limit && code === 40) {
      effects.consume(code);
      balance++;
      return raw;
    }
    if (code === 41) {
      effects.consume(code);
      balance--;
      return raw;
    }
    if (code === null || code === 32 || code === 40 || asciiControl(code)) {
      return nok(code);
    }
    effects.consume(code);
    return code === 92 ? rawEscape : raw;
  }
  function rawEscape(code) {
    if (code === 40 || code === 41 || code === 92) {
      effects.consume(code);
      return raw;
    }
    return raw(code);
  }
}

// node_modules/micromark-factory-label/index.js
function factoryLabel(effects, ok, nok, type, markerType, stringType) {
  const self = this;
  let size = 0;
  let seen;
  return start;
  function start(code) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code);
    effects.exit(markerType);
    effects.enter(stringType);
    return atBreak;
  }
  function atBreak(code) {
    if (size > 999 || code === null || code === 91 || code === 93 && !seen || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    code === 94 && !size && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code);
    }
    if (code === 93) {
      effects.exit(stringType);
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok;
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return atBreak;
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return labelInside(code);
  }
  function labelInside(code) {
    if (code === null || code === 91 || code === 93 || markdownLineEnding(code) || size++ > 999) {
      effects.exit("chunkString");
      return atBreak(code);
    }
    effects.consume(code);
    if (!seen) seen = !markdownSpace(code);
    return code === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code) {
    if (code === 91 || code === 92 || code === 93) {
      effects.consume(code);
      size++;
      return labelInside;
    }
    return labelInside(code);
  }
}

// node_modules/micromark-factory-title/index.js
function factoryTitle(effects, ok, nok, type, markerType, stringType) {
  let marker;
  return start;
  function start(code) {
    if (code === 34 || code === 39 || code === 40) {
      effects.enter(type);
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      marker = code === 40 ? 41 : code;
      return begin;
    }
    return nok(code);
  }
  function begin(code) {
    if (code === marker) {
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok;
    }
    effects.enter(stringType);
    return atBreak(code);
  }
  function atBreak(code) {
    if (code === marker) {
      effects.exit(stringType);
      return begin(marker);
    }
    if (code === null) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return factorySpace(effects, atBreak, "linePrefix");
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return inside(code);
  }
  function inside(code) {
    if (code === marker || code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      return atBreak(code);
    }
    effects.consume(code);
    return code === 92 ? escape : inside;
  }
  function escape(code) {
    if (code === marker || code === 92) {
      effects.consume(code);
      return inside;
    }
    return inside(code);
  }
}

// node_modules/micromark-factory-whitespace/index.js
function factoryWhitespace(effects, ok) {
  let seen;
  return start;
  function start(code) {
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      seen = true;
      return start;
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code);
    }
    return ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/definition.js
var definition = {
  name: "definition",
  tokenize: tokenizeDefinition
};
var titleBefore = {
  partial: true,
  tokenize: tokenizeTitleBefore
};
function tokenizeDefinition(effects, ok, nok) {
  const self = this;
  let identifier;
  return start;
  function start(code) {
    effects.enter("definition");
    return before(code);
  }
  function before(code) {
    return factoryLabel.call(
      self,
      effects,
      labelAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(code);
  }
  function labelAfter(code) {
    identifier = normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1));
    if (code === 58) {
      effects.enter("definitionMarker");
      effects.consume(code);
      effects.exit("definitionMarker");
      return markerAfter;
    }
    return nok(code);
  }
  function markerAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, destinationBefore)(code) : destinationBefore(code);
  }
  function destinationBefore(code) {
    return factoryDestination(
      effects,
      destinationAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(code);
  }
  function destinationAfter(code) {
    return effects.attempt(titleBefore, after, after)(code);
  }
  function after(code) {
    return markdownSpace(code) ? factorySpace(effects, afterWhitespace, "whitespace")(code) : afterWhitespace(code);
  }
  function afterWhitespace(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("definition");
      self.parser.defined.push(identifier);
      return ok(code);
    }
    return nok(code);
  }
}
function tokenizeTitleBefore(effects, ok, nok) {
  return titleBefore2;
  function titleBefore2(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, beforeMarker)(code) : nok(code);
  }
  function beforeMarker(code) {
    return factoryTitle(effects, titleAfter, nok, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(code);
  }
  function titleAfter(code) {
    return markdownSpace(code) ? factorySpace(effects, titleAfterOptionalWhitespace, "whitespace")(code) : titleAfterOptionalWhitespace(code);
  }
  function titleAfterOptionalWhitespace(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/hard-break-escape.js
var hardBreakEscape = {
  name: "hardBreakEscape",
  tokenize: tokenizeHardBreakEscape
};
function tokenizeHardBreakEscape(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("hardBreakEscape");
    effects.consume(code);
    return after;
  }
  function after(code) {
    if (markdownLineEnding(code)) {
      effects.exit("hardBreakEscape");
      return ok(code);
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/heading-atx.js
var headingAtx = {
  name: "headingAtx",
  resolve: resolveHeadingAtx,
  tokenize: tokenizeHeadingAtx
};
function resolveHeadingAtx(events, context) {
  let contentEnd = events.length - 2;
  let contentStart = 3;
  let content3;
  let text3;
  if (events[contentStart][1].type === "whitespace") {
    contentStart += 2;
  }
  if (contentEnd - 2 > contentStart && events[contentEnd][1].type === "whitespace") {
    contentEnd -= 2;
  }
  if (events[contentEnd][1].type === "atxHeadingSequence" && (contentStart === contentEnd - 1 || contentEnd - 4 > contentStart && events[contentEnd - 2][1].type === "whitespace")) {
    contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
  }
  if (contentEnd > contentStart) {
    content3 = {
      type: "atxHeadingText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end
    };
    text3 = {
      type: "chunkText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end,
      contentType: "text"
    };
    splice(events, contentStart, contentEnd - contentStart + 1, [["enter", content3, context], ["enter", text3, context], ["exit", text3, context], ["exit", content3, context]]);
  }
  return events;
}
function tokenizeHeadingAtx(effects, ok, nok) {
  let size = 0;
  return start;
  function start(code) {
    effects.enter("atxHeading");
    return before(code);
  }
  function before(code) {
    effects.enter("atxHeadingSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === 35 && size++ < 6) {
      effects.consume(code);
      return sequenceOpen;
    }
    if (code === null || markdownLineEndingOrSpace(code)) {
      effects.exit("atxHeadingSequence");
      return atBreak(code);
    }
    return nok(code);
  }
  function atBreak(code) {
    if (code === 35) {
      effects.enter("atxHeadingSequence");
      return sequenceFurther(code);
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit("atxHeading");
      return ok(code);
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, atBreak, "whitespace")(code);
    }
    effects.enter("atxHeadingText");
    return data(code);
  }
  function sequenceFurther(code) {
    if (code === 35) {
      effects.consume(code);
      return sequenceFurther;
    }
    effects.exit("atxHeadingSequence");
    return atBreak(code);
  }
  function data(code) {
    if (code === null || code === 35 || markdownLineEndingOrSpace(code)) {
      effects.exit("atxHeadingText");
      return atBreak(code);
    }
    effects.consume(code);
    return data;
  }
}

// node_modules/micromark-util-html-tag-name/index.js
var htmlBlockNames = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
];
var htmlRawNames = ["pre", "script", "style", "textarea"];

// node_modules/micromark-core-commonmark/lib/html-flow.js
var htmlFlow = {
  concrete: true,
  name: "htmlFlow",
  resolveTo: resolveToHtmlFlow,
  tokenize: tokenizeHtmlFlow
};
var blankLineBefore = {
  partial: true,
  tokenize: tokenizeBlankLineBefore
};
var nonLazyContinuationStart = {
  partial: true,
  tokenize: tokenizeNonLazyContinuationStart
};
function resolveToHtmlFlow(events) {
  let index2 = events.length;
  while (index2--) {
    if (events[index2][0] === "enter" && events[index2][1].type === "htmlFlow") {
      break;
    }
  }
  if (index2 > 1 && events[index2 - 2][1].type === "linePrefix") {
    events[index2][1].start = events[index2 - 2][1].start;
    events[index2 + 1][1].start = events[index2 - 2][1].start;
    events.splice(index2 - 2, 2);
  }
  return events;
}
function tokenizeHtmlFlow(effects, ok, nok) {
  const self = this;
  let marker;
  let closingTag;
  let buffer;
  let index2;
  let markerB;
  return start;
  function start(code) {
    return before(code);
  }
  function before(code) {
    effects.enter("htmlFlow");
    effects.enter("htmlFlowData");
    effects.consume(code);
    return open;
  }
  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationOpen;
    }
    if (code === 47) {
      effects.consume(code);
      closingTag = true;
      return tagCloseStart;
    }
    if (code === 63) {
      effects.consume(code);
      marker = 3;
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function declarationOpen(code) {
    if (code === 45) {
      effects.consume(code);
      marker = 2;
      return commentOpenInside;
    }
    if (code === 91) {
      effects.consume(code);
      marker = 5;
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      marker = 4;
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    return nok(code);
  }
  function commentOpenInside(code) {
    if (code === 45) {
      effects.consume(code);
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    return nok(code);
  }
  function cdataOpenInside(code) {
    const value = "CDATA[";
    if (code === value.charCodeAt(index2++)) {
      effects.consume(code);
      if (index2 === value.length) {
        return self.interrupt ? ok : continuation;
      }
      return cdataOpenInside;
    }
    return nok(code);
  }
  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function tagName(code) {
    if (code === null || code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      const slash = code === 47;
      const name = buffer.toLowerCase();
      if (!slash && !closingTag && htmlRawNames.includes(name)) {
        marker = 1;
        return self.interrupt ? ok(code) : continuation(code);
      }
      if (htmlBlockNames.includes(buffer.toLowerCase())) {
        marker = 6;
        if (slash) {
          effects.consume(code);
          return basicSelfClosing;
        }
        return self.interrupt ? ok(code) : continuation(code);
      }
      marker = 7;
      return self.interrupt && !self.parser.lazy[self.now().line] ? nok(code) : closingTag ? completeClosingTagAfter(code) : completeAttributeNameBefore(code);
    }
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function basicSelfClosing(code) {
    if (code === 62) {
      effects.consume(code);
      return self.interrupt ? ok : continuation;
    }
    return nok(code);
  }
  function completeClosingTagAfter(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeClosingTagAfter;
    }
    return completeEnd(code);
  }
  function completeAttributeNameBefore(code) {
    if (code === 47) {
      effects.consume(code);
      return completeEnd;
    }
    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return completeAttributeName;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameBefore;
    }
    return completeEnd(code);
  }
  function completeAttributeName(code) {
    if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return completeAttributeName;
    }
    return completeAttributeNameAfter(code);
  }
  function completeAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return completeAttributeValueBefore;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameAfter;
    }
    return completeAttributeNameBefore(code);
  }
  function completeAttributeValueBefore(code) {
    if (code === null || code === 60 || code === 61 || code === 62 || code === 96) {
      return nok(code);
    }
    if (code === 34 || code === 39) {
      effects.consume(code);
      markerB = code;
      return completeAttributeValueQuoted;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeValueBefore;
    }
    return completeAttributeValueUnquoted(code);
  }
  function completeAttributeValueQuoted(code) {
    if (code === markerB) {
      effects.consume(code);
      markerB = null;
      return completeAttributeValueQuotedAfter;
    }
    if (code === null || markdownLineEnding(code)) {
      return nok(code);
    }
    effects.consume(code);
    return completeAttributeValueQuoted;
  }
  function completeAttributeValueUnquoted(code) {
    if (code === null || code === 34 || code === 39 || code === 47 || code === 60 || code === 61 || code === 62 || code === 96 || markdownLineEndingOrSpace(code)) {
      return completeAttributeNameAfter(code);
    }
    effects.consume(code);
    return completeAttributeValueUnquoted;
  }
  function completeAttributeValueQuotedAfter(code) {
    if (code === 47 || code === 62 || markdownSpace(code)) {
      return completeAttributeNameBefore(code);
    }
    return nok(code);
  }
  function completeEnd(code) {
    if (code === 62) {
      effects.consume(code);
      return completeAfter;
    }
    return nok(code);
  }
  function completeAfter(code) {
    if (code === null || markdownLineEnding(code)) {
      return continuation(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAfter;
    }
    return nok(code);
  }
  function continuation(code) {
    if (code === 45 && marker === 2) {
      effects.consume(code);
      return continuationCommentInside;
    }
    if (code === 60 && marker === 1) {
      effects.consume(code);
      return continuationRawTagOpen;
    }
    if (code === 62 && marker === 4) {
      effects.consume(code);
      return continuationClose;
    }
    if (code === 63 && marker === 3) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    if (code === 93 && marker === 5) {
      effects.consume(code);
      return continuationCdataInside;
    }
    if (markdownLineEnding(code) && (marker === 6 || marker === 7)) {
      effects.exit("htmlFlowData");
      return effects.check(blankLineBefore, continuationAfter, continuationStart)(code);
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit("htmlFlowData");
      return continuationStart(code);
    }
    effects.consume(code);
    return continuation;
  }
  function continuationStart(code) {
    return effects.check(nonLazyContinuationStart, continuationStartNonLazy, continuationAfter)(code);
  }
  function continuationStartNonLazy(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return continuationBefore;
  }
  function continuationBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      return continuationStart(code);
    }
    effects.enter("htmlFlowData");
    return continuation(code);
  }
  function continuationCommentInside(code) {
    if (code === 45) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationRawTagOpen(code) {
    if (code === 47) {
      effects.consume(code);
      buffer = "";
      return continuationRawEndTag;
    }
    return continuation(code);
  }
  function continuationRawEndTag(code) {
    if (code === 62) {
      const name = buffer.toLowerCase();
      if (htmlRawNames.includes(name)) {
        effects.consume(code);
        return continuationClose;
      }
      return continuation(code);
    }
    if (asciiAlpha(code) && buffer.length < 8) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return continuationRawEndTag;
    }
    return continuation(code);
  }
  function continuationCdataInside(code) {
    if (code === 93) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationDeclarationInside(code) {
    if (code === 62) {
      effects.consume(code);
      return continuationClose;
    }
    if (code === 45 && marker === 2) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationClose(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("htmlFlowData");
      return continuationAfter(code);
    }
    effects.consume(code);
    return continuationClose;
  }
  function continuationAfter(code) {
    effects.exit("htmlFlow");
    return ok(code);
  }
}
function tokenizeNonLazyContinuationStart(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}
function tokenizeBlankLineBefore(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return effects.attempt(blankLine, ok, nok);
  }
}

// node_modules/micromark-core-commonmark/lib/html-text.js
var htmlText = {
  name: "htmlText",
  tokenize: tokenizeHtmlText
};
function tokenizeHtmlText(effects, ok, nok) {
  const self = this;
  let marker;
  let index2;
  let returnState;
  return start;
  function start(code) {
    effects.enter("htmlText");
    effects.enter("htmlTextData");
    effects.consume(code);
    return open;
  }
  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationOpen;
    }
    if (code === 47) {
      effects.consume(code);
      return tagCloseStart;
    }
    if (code === 63) {
      effects.consume(code);
      return instruction;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagOpen;
    }
    return nok(code);
  }
  function declarationOpen(code) {
    if (code === 45) {
      effects.consume(code);
      return commentOpenInside;
    }
    if (code === 91) {
      effects.consume(code);
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      return declaration;
    }
    return nok(code);
  }
  function commentOpenInside(code) {
    if (code === 45) {
      effects.consume(code);
      return commentEnd;
    }
    return nok(code);
  }
  function comment(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 45) {
      effects.consume(code);
      return commentClose;
    }
    if (markdownLineEnding(code)) {
      returnState = comment;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return comment;
  }
  function commentClose(code) {
    if (code === 45) {
      effects.consume(code);
      return commentEnd;
    }
    return comment(code);
  }
  function commentEnd(code) {
    return code === 62 ? end(code) : code === 45 ? commentClose(code) : comment(code);
  }
  function cdataOpenInside(code) {
    const value = "CDATA[";
    if (code === value.charCodeAt(index2++)) {
      effects.consume(code);
      return index2 === value.length ? cdata : cdataOpenInside;
    }
    return nok(code);
  }
  function cdata(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 93) {
      effects.consume(code);
      return cdataClose;
    }
    if (markdownLineEnding(code)) {
      returnState = cdata;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return cdata;
  }
  function cdataClose(code) {
    if (code === 93) {
      effects.consume(code);
      return cdataEnd;
    }
    return cdata(code);
  }
  function cdataEnd(code) {
    if (code === 62) {
      return end(code);
    }
    if (code === 93) {
      effects.consume(code);
      return cdataEnd;
    }
    return cdata(code);
  }
  function declaration(code) {
    if (code === null || code === 62) {
      return end(code);
    }
    if (markdownLineEnding(code)) {
      returnState = declaration;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return declaration;
  }
  function instruction(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 63) {
      effects.consume(code);
      return instructionClose;
    }
    if (markdownLineEnding(code)) {
      returnState = instruction;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return instruction;
  }
  function instructionClose(code) {
    return code === 62 ? end(code) : instruction(code);
  }
  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagClose;
    }
    return nok(code);
  }
  function tagClose(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagClose;
    }
    return tagCloseBetween(code);
  }
  function tagCloseBetween(code) {
    if (markdownLineEnding(code)) {
      returnState = tagCloseBetween;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagCloseBetween;
    }
    return end(code);
  }
  function tagOpen(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagOpen;
    }
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    return nok(code);
  }
  function tagOpenBetween(code) {
    if (code === 47) {
      effects.consume(code);
      return end;
    }
    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return tagOpenAttributeName;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenBetween;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenBetween;
    }
    return end(code);
  }
  function tagOpenAttributeName(code) {
    if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagOpenAttributeName;
    }
    return tagOpenAttributeNameAfter(code);
  }
  function tagOpenAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return tagOpenAttributeValueBefore;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeNameAfter;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeNameAfter;
    }
    return tagOpenBetween(code);
  }
  function tagOpenAttributeValueBefore(code) {
    if (code === null || code === 60 || code === 61 || code === 62 || code === 96) {
      return nok(code);
    }
    if (code === 34 || code === 39) {
      effects.consume(code);
      marker = code;
      return tagOpenAttributeValueQuoted;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueBefore;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeValueBefore;
    }
    effects.consume(code);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuoted(code) {
    if (code === marker) {
      effects.consume(code);
      marker = void 0;
      return tagOpenAttributeValueQuotedAfter;
    }
    if (code === null) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueQuoted;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return tagOpenAttributeValueQuoted;
  }
  function tagOpenAttributeValueUnquoted(code) {
    if (code === null || code === 34 || code === 39 || code === 60 || code === 61 || code === 96) {
      return nok(code);
    }
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    effects.consume(code);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuotedAfter(code) {
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    return nok(code);
  }
  function end(code) {
    if (code === 62) {
      effects.consume(code);
      effects.exit("htmlTextData");
      effects.exit("htmlText");
      return ok;
    }
    return nok(code);
  }
  function lineEndingBefore(code) {
    effects.exit("htmlTextData");
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return lineEndingAfter;
  }
  function lineEndingAfter(code) {
    return markdownSpace(code) ? factorySpace(effects, lineEndingAfterPrefix, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : lineEndingAfterPrefix(code);
  }
  function lineEndingAfterPrefix(code) {
    effects.enter("htmlTextData");
    return returnState(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-end.js
var labelEnd = {
  name: "labelEnd",
  resolveAll: resolveAllLabelEnd,
  resolveTo: resolveToLabelEnd,
  tokenize: tokenizeLabelEnd
};
var resourceConstruct = {
  tokenize: tokenizeResource
};
var referenceFullConstruct = {
  tokenize: tokenizeReferenceFull
};
var referenceCollapsedConstruct = {
  tokenize: tokenizeReferenceCollapsed
};
function resolveAllLabelEnd(events) {
  let index2 = -1;
  const newEvents = [];
  while (++index2 < events.length) {
    const token = events[index2][1];
    newEvents.push(events[index2]);
    if (token.type === "labelImage" || token.type === "labelLink" || token.type === "labelEnd") {
      const offset = token.type === "labelImage" ? 4 : 2;
      token.type = "data";
      index2 += offset;
    }
  }
  if (events.length !== newEvents.length) {
    splice(events, 0, events.length, newEvents);
  }
  return events;
}
function resolveToLabelEnd(events, context) {
  let index2 = events.length;
  let offset = 0;
  let token;
  let open;
  let close;
  let media;
  while (index2--) {
    token = events[index2][1];
    if (open) {
      if (token.type === "link" || token.type === "labelLink" && token._inactive) {
        break;
      }
      if (events[index2][0] === "enter" && token.type === "labelLink") {
        token._inactive = true;
      }
    } else if (close) {
      if (events[index2][0] === "enter" && (token.type === "labelImage" || token.type === "labelLink") && !token._balanced) {
        open = index2;
        if (token.type !== "labelLink") {
          offset = 2;
          break;
        }
      }
    } else if (token.type === "labelEnd") {
      close = index2;
    }
  }
  const group = {
    type: events[open][1].type === "labelLink" ? "link" : "image",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  const label = {
    type: "label",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[close][1].end
    }
  };
  const text3 = {
    type: "labelText",
    start: {
      ...events[open + offset + 2][1].end
    },
    end: {
      ...events[close - 2][1].start
    }
  };
  media = [["enter", group, context], ["enter", label, context]];
  media = push(media, events.slice(open + 1, open + offset + 3));
  media = push(media, [["enter", text3, context]]);
  media = push(media, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + offset + 4, close - 3), context));
  media = push(media, [["exit", text3, context], events[close - 2], events[close - 1], ["exit", label, context]]);
  media = push(media, events.slice(close + 1));
  media = push(media, [["exit", group, context]]);
  splice(events, open, events.length, media);
  return events;
}
function tokenizeLabelEnd(effects, ok, nok) {
  const self = this;
  let index2 = self.events.length;
  let labelStart;
  let defined;
  while (index2--) {
    if ((self.events[index2][1].type === "labelImage" || self.events[index2][1].type === "labelLink") && !self.events[index2][1]._balanced) {
      labelStart = self.events[index2][1];
      break;
    }
  }
  return start;
  function start(code) {
    if (!labelStart) {
      return nok(code);
    }
    if (labelStart._inactive) {
      return labelEndNok(code);
    }
    defined = self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize({
      start: labelStart.end,
      end: self.now()
    })));
    effects.enter("labelEnd");
    effects.enter("labelMarker");
    effects.consume(code);
    effects.exit("labelMarker");
    effects.exit("labelEnd");
    return after;
  }
  function after(code) {
    if (code === 40) {
      return effects.attempt(resourceConstruct, labelEndOk, defined ? labelEndOk : labelEndNok)(code);
    }
    if (code === 91) {
      return effects.attempt(referenceFullConstruct, labelEndOk, defined ? referenceNotFull : labelEndNok)(code);
    }
    return defined ? labelEndOk(code) : labelEndNok(code);
  }
  function referenceNotFull(code) {
    return effects.attempt(referenceCollapsedConstruct, labelEndOk, labelEndNok)(code);
  }
  function labelEndOk(code) {
    return ok(code);
  }
  function labelEndNok(code) {
    labelStart._balanced = true;
    return nok(code);
  }
}
function tokenizeResource(effects, ok, nok) {
  return resourceStart;
  function resourceStart(code) {
    effects.enter("resource");
    effects.enter("resourceMarker");
    effects.consume(code);
    effects.exit("resourceMarker");
    return resourceBefore;
  }
  function resourceBefore(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceOpen)(code) : resourceOpen(code);
  }
  function resourceOpen(code) {
    if (code === 41) {
      return resourceEnd(code);
    }
    return factoryDestination(effects, resourceDestinationAfter, resourceDestinationMissing, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(code);
  }
  function resourceDestinationAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceBetween)(code) : resourceEnd(code);
  }
  function resourceDestinationMissing(code) {
    return nok(code);
  }
  function resourceBetween(code) {
    if (code === 34 || code === 39 || code === 40) {
      return factoryTitle(effects, resourceTitleAfter, nok, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(code);
    }
    return resourceEnd(code);
  }
  function resourceTitleAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceEnd)(code) : resourceEnd(code);
  }
  function resourceEnd(code) {
    if (code === 41) {
      effects.enter("resourceMarker");
      effects.consume(code);
      effects.exit("resourceMarker");
      effects.exit("resource");
      return ok;
    }
    return nok(code);
  }
}
function tokenizeReferenceFull(effects, ok, nok) {
  const self = this;
  return referenceFull;
  function referenceFull(code) {
    return factoryLabel.call(self, effects, referenceFullAfter, referenceFullMissing, "reference", "referenceMarker", "referenceString")(code);
  }
  function referenceFullAfter(code) {
    return self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1))) ? ok(code) : nok(code);
  }
  function referenceFullMissing(code) {
    return nok(code);
  }
}
function tokenizeReferenceCollapsed(effects, ok, nok) {
  return referenceCollapsedStart;
  function referenceCollapsedStart(code) {
    effects.enter("reference");
    effects.enter("referenceMarker");
    effects.consume(code);
    effects.exit("referenceMarker");
    return referenceCollapsedOpen;
  }
  function referenceCollapsedOpen(code) {
    if (code === 93) {
      effects.enter("referenceMarker");
      effects.consume(code);
      effects.exit("referenceMarker");
      effects.exit("reference");
      return ok;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-image.js
var labelStartImage = {
  name: "labelStartImage",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartImage
};
function tokenizeLabelStartImage(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    effects.enter("labelImage");
    effects.enter("labelImageMarker");
    effects.consume(code);
    effects.exit("labelImageMarker");
    return open;
  }
  function open(code) {
    if (code === 91) {
      effects.enter("labelMarker");
      effects.consume(code);
      effects.exit("labelMarker");
      effects.exit("labelImage");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    return code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code) : ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-link.js
var labelStartLink = {
  name: "labelStartLink",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartLink
};
function tokenizeLabelStartLink(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    effects.enter("labelLink");
    effects.enter("labelMarker");
    effects.consume(code);
    effects.exit("labelMarker");
    effects.exit("labelLink");
    return after;
  }
  function after(code) {
    return code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code) : ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/line-ending.js
var lineEnding = {
  name: "lineEnding",
  tokenize: tokenizeLineEnding
};
function tokenizeLineEnding(effects, ok) {
  return start;
  function start(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, ok, "linePrefix");
  }
}

// node_modules/micromark-core-commonmark/lib/thematic-break.js
var thematicBreak = {
  name: "thematicBreak",
  tokenize: tokenizeThematicBreak
};
function tokenizeThematicBreak(effects, ok, nok) {
  let size = 0;
  let marker;
  return start;
  function start(code) {
    effects.enter("thematicBreak");
    return before(code);
  }
  function before(code) {
    marker = code;
    return atBreak(code);
  }
  function atBreak(code) {
    if (code === marker) {
      effects.enter("thematicBreakSequence");
      return sequence(code);
    }
    if (size >= 3 && (code === null || markdownLineEnding(code))) {
      effects.exit("thematicBreak");
      return ok(code);
    }
    return nok(code);
  }
  function sequence(code) {
    if (code === marker) {
      effects.consume(code);
      size++;
      return sequence;
    }
    effects.exit("thematicBreakSequence");
    return markdownSpace(code) ? factorySpace(effects, atBreak, "whitespace")(code) : atBreak(code);
  }
}

// node_modules/micromark-core-commonmark/lib/list.js
var list = {
  continuation: {
    tokenize: tokenizeListContinuation
  },
  exit: tokenizeListEnd,
  name: "list",
  tokenize: tokenizeListStart
};
var listItemPrefixWhitespaceConstruct = {
  partial: true,
  tokenize: tokenizeListItemPrefixWhitespace
};
var indentConstruct = {
  partial: true,
  tokenize: tokenizeIndent
};
function tokenizeListStart(effects, ok, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  let initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let size = 0;
  return start;
  function start(code) {
    const kind = self.containerState.type || (code === 42 || code === 43 || code === 45 ? "listUnordered" : "listOrdered");
    if (kind === "listUnordered" ? !self.containerState.marker || code === self.containerState.marker : asciiDigit(code)) {
      if (!self.containerState.type) {
        self.containerState.type = kind;
        effects.enter(kind, {
          _container: true
        });
      }
      if (kind === "listUnordered") {
        effects.enter("listItemPrefix");
        return code === 42 || code === 45 ? effects.check(thematicBreak, nok, atMarker)(code) : atMarker(code);
      }
      if (!self.interrupt || code === 49) {
        effects.enter("listItemPrefix");
        effects.enter("listItemValue");
        return inside(code);
      }
    }
    return nok(code);
  }
  function inside(code) {
    if (asciiDigit(code) && ++size < 10) {
      effects.consume(code);
      return inside;
    }
    if ((!self.interrupt || size < 2) && (self.containerState.marker ? code === self.containerState.marker : code === 41 || code === 46)) {
      effects.exit("listItemValue");
      return atMarker(code);
    }
    return nok(code);
  }
  function atMarker(code) {
    effects.enter("listItemMarker");
    effects.consume(code);
    effects.exit("listItemMarker");
    self.containerState.marker = self.containerState.marker || code;
    return effects.check(
      blankLine,
      // Can’t be empty when interrupting.
      self.interrupt ? nok : onBlank,
      effects.attempt(listItemPrefixWhitespaceConstruct, endOfPrefix, otherPrefix)
    );
  }
  function onBlank(code) {
    self.containerState.initialBlankLine = true;
    initialSize++;
    return endOfPrefix(code);
  }
  function otherPrefix(code) {
    if (markdownSpace(code)) {
      effects.enter("listItemPrefixWhitespace");
      effects.consume(code);
      effects.exit("listItemPrefixWhitespace");
      return endOfPrefix;
    }
    return nok(code);
  }
  function endOfPrefix(code) {
    self.containerState.size = initialSize + self.sliceSerialize(effects.exit("listItemPrefix"), true).length;
    return ok(code);
  }
}
function tokenizeListContinuation(effects, ok, nok) {
  const self = this;
  self.containerState._closeFlow = void 0;
  return effects.check(blankLine, onBlank, notBlank);
  function onBlank(code) {
    self.containerState.furtherBlankLines = self.containerState.furtherBlankLines || self.containerState.initialBlankLine;
    return factorySpace(effects, ok, "listItemIndent", self.containerState.size + 1)(code);
  }
  function notBlank(code) {
    if (self.containerState.furtherBlankLines || !markdownSpace(code)) {
      self.containerState.furtherBlankLines = void 0;
      self.containerState.initialBlankLine = void 0;
      return notInCurrentItem(code);
    }
    self.containerState.furtherBlankLines = void 0;
    self.containerState.initialBlankLine = void 0;
    return effects.attempt(indentConstruct, ok, notInCurrentItem)(code);
  }
  function notInCurrentItem(code) {
    self.containerState._closeFlow = true;
    self.interrupt = void 0;
    return factorySpace(effects, effects.attempt(list, ok, nok), "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
  }
}
function tokenizeIndent(effects, ok, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemIndent", self.containerState.size + 1);
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "listItemIndent" && tail[2].sliceSerialize(tail[1], true).length === self.containerState.size ? ok(code) : nok(code);
  }
}
function tokenizeListEnd(effects) {
  effects.exit(this.containerState.type);
}
function tokenizeListItemPrefixWhitespace(effects, ok, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemPrefixWhitespace", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4 + 1);
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return !markdownSpace(code) && tail && tail[1].type === "listItemPrefixWhitespace" ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/setext-underline.js
var setextUnderline = {
  name: "setextUnderline",
  resolveTo: resolveToSetextUnderline,
  tokenize: tokenizeSetextUnderline
};
function resolveToSetextUnderline(events, context) {
  let index2 = events.length;
  let content3;
  let text3;
  let definition2;
  while (index2--) {
    if (events[index2][0] === "enter") {
      if (events[index2][1].type === "content") {
        content3 = index2;
        break;
      }
      if (events[index2][1].type === "paragraph") {
        text3 = index2;
      }
    } else {
      if (events[index2][1].type === "content") {
        events.splice(index2, 1);
      }
      if (!definition2 && events[index2][1].type === "definition") {
        definition2 = index2;
      }
    }
  }
  const heading = {
    type: "setextHeading",
    start: {
      ...events[content3][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  events[text3][1].type = "setextHeadingText";
  if (definition2) {
    events.splice(text3, 0, ["enter", heading, context]);
    events.splice(definition2 + 1, 0, ["exit", events[content3][1], context]);
    events[content3][1].end = {
      ...events[definition2][1].end
    };
  } else {
    events[content3][1] = heading;
  }
  events.push(["exit", heading, context]);
  return events;
}
function tokenizeSetextUnderline(effects, ok, nok) {
  const self = this;
  let marker;
  return start;
  function start(code) {
    let index2 = self.events.length;
    let paragraph;
    while (index2--) {
      if (self.events[index2][1].type !== "lineEnding" && self.events[index2][1].type !== "linePrefix" && self.events[index2][1].type !== "content") {
        paragraph = self.events[index2][1].type === "paragraph";
        break;
      }
    }
    if (!self.parser.lazy[self.now().line] && (self.interrupt || paragraph)) {
      effects.enter("setextHeadingLine");
      marker = code;
      return before(code);
    }
    return nok(code);
  }
  function before(code) {
    effects.enter("setextHeadingLineSequence");
    return inside(code);
  }
  function inside(code) {
    if (code === marker) {
      effects.consume(code);
      return inside;
    }
    effects.exit("setextHeadingLineSequence");
    return markdownSpace(code) ? factorySpace(effects, after, "lineSuffix")(code) : after(code);
  }
  function after(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("setextHeadingLine");
      return ok(code);
    }
    return nok(code);
  }
}

// node_modules/micromark/lib/initialize/flow.js
var flow = {
  tokenize: initializeFlow
};
function initializeFlow(effects) {
  const self = this;
  const initial = effects.attempt(
    // Try to parse a blank line.
    blankLine,
    atBlankEnding,
    // Try to parse initial flow (essentially, only code).
    effects.attempt(this.parser.constructs.flowInitial, afterConstruct, factorySpace(effects, effects.attempt(this.parser.constructs.flow, afterConstruct, effects.attempt(content2, afterConstruct)), "linePrefix"))
  );
  return initial;
  function atBlankEnding(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEndingBlank");
    effects.consume(code);
    effects.exit("lineEndingBlank");
    self.currentConstruct = void 0;
    return initial;
  }
  function afterConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    self.currentConstruct = void 0;
    return initial;
  }
}

// node_modules/micromark/lib/initialize/text.js
var resolver = {
  resolveAll: createResolver()
};
var string2 = initializeFactory("string");
var text = initializeFactory("text");
function initializeFactory(field) {
  return {
    resolveAll: createResolver(field === "text" ? resolveAllLineSuffixes : void 0),
    tokenize: initializeText
  };
  function initializeText(effects) {
    const self = this;
    const constructs2 = this.parser.constructs[field];
    const text3 = effects.attempt(constructs2, start, notText);
    return start;
    function start(code) {
      return atBreak(code) ? text3(code) : notText(code);
    }
    function notText(code) {
      if (code === null) {
        effects.consume(code);
        return;
      }
      effects.enter("data");
      effects.consume(code);
      return data;
    }
    function data(code) {
      if (atBreak(code)) {
        effects.exit("data");
        return text3(code);
      }
      effects.consume(code);
      return data;
    }
    function atBreak(code) {
      if (code === null) {
        return true;
      }
      const list2 = constructs2[code];
      let index2 = -1;
      if (list2) {
        while (++index2 < list2.length) {
          const item = list2[index2];
          if (!item.previous || item.previous.call(self, self.previous)) {
            return true;
          }
        }
      }
      return false;
    }
  }
}
function createResolver(extraResolver) {
  return resolveAllText;
  function resolveAllText(events, context) {
    let index2 = -1;
    let enter;
    while (++index2 <= events.length) {
      if (enter === void 0) {
        if (events[index2] && events[index2][1].type === "data") {
          enter = index2;
          index2++;
        }
      } else if (!events[index2] || events[index2][1].type !== "data") {
        if (index2 !== enter + 2) {
          events[enter][1].end = events[index2 - 1][1].end;
          events.splice(enter + 2, index2 - enter - 2);
          index2 = enter + 2;
        }
        enter = void 0;
      }
    }
    return extraResolver ? extraResolver(events, context) : events;
  }
}
function resolveAllLineSuffixes(events, context) {
  let eventIndex = 0;
  while (++eventIndex <= events.length) {
    if ((eventIndex === events.length || events[eventIndex][1].type === "lineEnding") && events[eventIndex - 1][1].type === "data") {
      const data = events[eventIndex - 1][1];
      const chunks = context.sliceStream(data);
      let index2 = chunks.length;
      let bufferIndex = -1;
      let size = 0;
      let tabs;
      while (index2--) {
        const chunk = chunks[index2];
        if (typeof chunk === "string") {
          bufferIndex = chunk.length;
          while (chunk.charCodeAt(bufferIndex - 1) === 32) {
            size++;
            bufferIndex--;
          }
          if (bufferIndex) break;
          bufferIndex = -1;
        } else if (chunk === -2) {
          tabs = true;
          size++;
        } else if (chunk === -1) {
        } else {
          index2++;
          break;
        }
      }
      if (context._contentTypeTextTrailing && eventIndex === events.length) {
        size = 0;
      }
      if (size) {
        const token = {
          type: eventIndex === events.length || tabs || size < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: index2 ? bufferIndex : data.start._bufferIndex + bufferIndex,
            _index: data.start._index + index2,
            line: data.end.line,
            column: data.end.column - size,
            offset: data.end.offset - size
          },
          end: {
            ...data.end
          }
        };
        data.end = {
          ...token.start
        };
        if (data.start.offset === data.end.offset) {
          Object.assign(data, token);
        } else {
          events.splice(eventIndex, 0, ["enter", token, context], ["exit", token, context]);
          eventIndex += 2;
        }
      }
      eventIndex++;
    }
  }
  return events;
}

// node_modules/micromark/lib/constructs.js
var constructs_exports = {};
__export(constructs_exports, {
  attentionMarkers: () => attentionMarkers,
  contentInitial: () => contentInitial,
  disable: () => disable,
  document: () => document3,
  flow: () => flow2,
  flowInitial: () => flowInitial,
  insideSpan: () => insideSpan,
  string: () => string3,
  text: () => text2
});
var document3 = {
  [42]: list,
  [43]: list,
  [45]: list,
  [48]: list,
  [49]: list,
  [50]: list,
  [51]: list,
  [52]: list,
  [53]: list,
  [54]: list,
  [55]: list,
  [56]: list,
  [57]: list,
  [62]: blockQuote
};
var contentInitial = {
  [91]: definition
};
var flowInitial = {
  [-2]: codeIndented,
  [-1]: codeIndented,
  [32]: codeIndented
};
var flow2 = {
  [35]: headingAtx,
  [42]: thematicBreak,
  [45]: [setextUnderline, thematicBreak],
  [60]: htmlFlow,
  [61]: setextUnderline,
  [95]: thematicBreak,
  [96]: codeFenced,
  [126]: codeFenced
};
var string3 = {
  [38]: characterReference,
  [92]: characterEscape
};
var text2 = {
  [-5]: lineEnding,
  [-4]: lineEnding,
  [-3]: lineEnding,
  [33]: labelStartImage,
  [38]: characterReference,
  [42]: attention,
  [60]: [autolink, htmlText],
  [91]: labelStartLink,
  [92]: [hardBreakEscape, characterEscape],
  [93]: labelEnd,
  [95]: attention,
  [96]: codeText
};
var insideSpan = {
  null: [attention, resolver]
};
var attentionMarkers = {
  null: [42, 95]
};
var disable = {
  null: []
};

// node_modules/micromark/lib/create-tokenizer.js
function createTokenizer(parser, initialize, from) {
  let point3 = {
    _bufferIndex: -1,
    _index: 0,
    line: from && from.line || 1,
    column: from && from.column || 1,
    offset: from && from.offset || 0
  };
  const columnStart = {};
  const resolveAllConstructs = [];
  let chunks = [];
  let stack = [];
  let consumed = true;
  const effects = {
    attempt: constructFactory(onsuccessfulconstruct),
    check: constructFactory(onsuccessfulcheck),
    consume,
    enter,
    exit: exit2,
    interrupt: constructFactory(onsuccessfulcheck, {
      interrupt: true
    })
  };
  const context = {
    code: null,
    containerState: {},
    defineSkip,
    events: [],
    now,
    parser,
    previous: null,
    sliceSerialize,
    sliceStream,
    write
  };
  let state = initialize.tokenize.call(context, effects);
  let expectedCode;
  if (initialize.resolveAll) {
    resolveAllConstructs.push(initialize);
  }
  return context;
  function write(slice) {
    chunks = push(chunks, slice);
    main();
    if (chunks[chunks.length - 1] !== null) {
      return [];
    }
    addResult(initialize, 0);
    context.events = resolveAll(resolveAllConstructs, context.events, context);
    return context.events;
  }
  function sliceSerialize(token, expandTabs) {
    return serializeChunks(sliceStream(token), expandTabs);
  }
  function sliceStream(token) {
    return sliceChunks(chunks, token);
  }
  function now() {
    const {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    } = point3;
    return {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    };
  }
  function defineSkip(value) {
    columnStart[value.line] = value.column;
    accountForPotentialSkip();
  }
  function main() {
    let chunkIndex;
    while (point3._index < chunks.length) {
      const chunk = chunks[point3._index];
      if (typeof chunk === "string") {
        chunkIndex = point3._index;
        if (point3._bufferIndex < 0) {
          point3._bufferIndex = 0;
        }
        while (point3._index === chunkIndex && point3._bufferIndex < chunk.length) {
          go(chunk.charCodeAt(point3._bufferIndex));
        }
      } else {
        go(chunk);
      }
    }
  }
  function go(code) {
    consumed = void 0;
    expectedCode = code;
    state = state(code);
  }
  function consume(code) {
    if (markdownLineEnding(code)) {
      point3.line++;
      point3.column = 1;
      point3.offset += code === -3 ? 2 : 1;
      accountForPotentialSkip();
    } else if (code !== -1) {
      point3.column++;
      point3.offset++;
    }
    if (point3._bufferIndex < 0) {
      point3._index++;
    } else {
      point3._bufferIndex++;
      if (point3._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
      // strings.
      /** @type {string} */
      chunks[point3._index].length) {
        point3._bufferIndex = -1;
        point3._index++;
      }
    }
    context.previous = code;
    consumed = true;
  }
  function enter(type, fields) {
    const token = fields || {};
    token.type = type;
    token.start = now();
    context.events.push(["enter", token, context]);
    stack.push(token);
    return token;
  }
  function exit2(type) {
    const token = stack.pop();
    token.end = now();
    context.events.push(["exit", token, context]);
    return token;
  }
  function onsuccessfulconstruct(construct, info) {
    addResult(construct, info.from);
  }
  function onsuccessfulcheck(_, info) {
    info.restore();
  }
  function constructFactory(onreturn, fields) {
    return hook;
    function hook(constructs2, returnState, bogusState) {
      let listOfConstructs;
      let constructIndex;
      let currentConstruct;
      let info;
      return Array.isArray(constructs2) ? (
        /* c8 ignore next 1 */
        handleListOfConstructs(constructs2)
      ) : "tokenize" in constructs2 ? (
        // Looks like a construct.
        handleListOfConstructs([
          /** @type {Construct} */
          constructs2
        ])
      ) : handleMapOfConstructs(constructs2);
      function handleMapOfConstructs(map2) {
        return start;
        function start(code) {
          const left = code !== null && map2[code];
          const all2 = code !== null && map2.null;
          const list2 = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(left) ? left : left ? [left] : [],
            ...Array.isArray(all2) ? all2 : all2 ? [all2] : []
          ];
          return handleListOfConstructs(list2)(code);
        }
      }
      function handleListOfConstructs(list2) {
        listOfConstructs = list2;
        constructIndex = 0;
        if (list2.length === 0) {
          return bogusState;
        }
        return handleConstruct(list2[constructIndex]);
      }
      function handleConstruct(construct) {
        return start;
        function start(code) {
          info = store();
          currentConstruct = construct;
          if (!construct.partial) {
            context.currentConstruct = construct;
          }
          if (construct.name && context.parser.constructs.disable.null.includes(construct.name)) {
            return nok(code);
          }
          return construct.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            fields ? Object.assign(Object.create(context), fields) : context,
            effects,
            ok,
            nok
          )(code);
        }
      }
      function ok(code) {
        consumed = true;
        onreturn(currentConstruct, info);
        return returnState;
      }
      function nok(code) {
        consumed = true;
        info.restore();
        if (++constructIndex < listOfConstructs.length) {
          return handleConstruct(listOfConstructs[constructIndex]);
        }
        return bogusState;
      }
    }
  }
  function addResult(construct, from2) {
    if (construct.resolveAll && !resolveAllConstructs.includes(construct)) {
      resolveAllConstructs.push(construct);
    }
    if (construct.resolve) {
      splice(context.events, from2, context.events.length - from2, construct.resolve(context.events.slice(from2), context));
    }
    if (construct.resolveTo) {
      context.events = construct.resolveTo(context.events, context);
    }
  }
  function store() {
    const startPoint = now();
    const startPrevious = context.previous;
    const startCurrentConstruct = context.currentConstruct;
    const startEventsIndex = context.events.length;
    const startStack = Array.from(stack);
    return {
      from: startEventsIndex,
      restore
    };
    function restore() {
      point3 = startPoint;
      context.previous = startPrevious;
      context.currentConstruct = startCurrentConstruct;
      context.events.length = startEventsIndex;
      stack = startStack;
      accountForPotentialSkip();
    }
  }
  function accountForPotentialSkip() {
    if (point3.line in columnStart && point3.column < 2) {
      point3.column = columnStart[point3.line];
      point3.offset += columnStart[point3.line] - 1;
    }
  }
}
function sliceChunks(chunks, token) {
  const startIndex = token.start._index;
  const startBufferIndex = token.start._bufferIndex;
  const endIndex = token.end._index;
  const endBufferIndex = token.end._bufferIndex;
  let view;
  if (startIndex === endIndex) {
    view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
  } else {
    view = chunks.slice(startIndex, endIndex);
    if (startBufferIndex > -1) {
      const head = view[0];
      if (typeof head === "string") {
        view[0] = head.slice(startBufferIndex);
      } else {
        view.shift();
      }
    }
    if (endBufferIndex > 0) {
      view.push(chunks[endIndex].slice(0, endBufferIndex));
    }
  }
  return view;
}
function serializeChunks(chunks, expandTabs) {
  let index2 = -1;
  const result = [];
  let atTab;
  while (++index2 < chunks.length) {
    const chunk = chunks[index2];
    let value;
    if (typeof chunk === "string") {
      value = chunk;
    } else switch (chunk) {
      case -5: {
        value = "\r";
        break;
      }
      case -4: {
        value = "\n";
        break;
      }
      case -3: {
        value = "\r\n";
        break;
      }
      case -2: {
        value = expandTabs ? " " : "	";
        break;
      }
      case -1: {
        if (!expandTabs && atTab) continue;
        value = " ";
        break;
      }
      default: {
        value = String.fromCharCode(chunk);
      }
    }
    atTab = chunk === -2;
    result.push(value);
  }
  return result.join("");
}

// node_modules/micromark/lib/parse.js
function parse2(options) {
  const settings = options || {};
  const constructs2 = (
    /** @type {FullNormalizedExtension} */
    combineExtensions([constructs_exports, ...settings.extensions || []])
  );
  const parser = {
    constructs: constructs2,
    content: create(content),
    defined: [],
    document: create(document2),
    flow: create(flow),
    lazy: {},
    string: create(string2),
    text: create(text)
  };
  return parser;
  function create(initial) {
    return creator;
    function creator(from) {
      return createTokenizer(parser, initial, from);
    }
  }
}

// node_modules/micromark/lib/postprocess.js
function postprocess(events) {
  while (!subtokenize(events)) {
  }
  return events;
}

// node_modules/micromark/lib/preprocess.js
var search = /[\0\t\n\r]/g;
function preprocess() {
  let column = 1;
  let buffer = "";
  let start = true;
  let atCarriageReturn;
  return preprocessor;
  function preprocessor(value, encoding, end) {
    const chunks = [];
    let match;
    let next;
    let startPosition;
    let endPosition;
    let code;
    value = buffer + (typeof value === "string" ? value.toString() : new TextDecoder(encoding || void 0).decode(value));
    startPosition = 0;
    buffer = "";
    if (start) {
      if (value.charCodeAt(0) === 65279) {
        startPosition++;
      }
      start = void 0;
    }
    while (startPosition < value.length) {
      search.lastIndex = startPosition;
      match = search.exec(value);
      endPosition = match && match.index !== void 0 ? match.index : value.length;
      code = value.charCodeAt(endPosition);
      if (!match) {
        buffer = value.slice(startPosition);
        break;
      }
      if (code === 10 && startPosition === endPosition && atCarriageReturn) {
        chunks.push(-3);
        atCarriageReturn = void 0;
      } else {
        if (atCarriageReturn) {
          chunks.push(-5);
          atCarriageReturn = void 0;
        }
        if (startPosition < endPosition) {
          chunks.push(value.slice(startPosition, endPosition));
          column += endPosition - startPosition;
        }
        switch (code) {
          case 0: {
            chunks.push(65533);
            column++;
            break;
          }
          case 9: {
            next = Math.ceil(column / 4) * 4;
            chunks.push(-2);
            while (column++ < next) chunks.push(-1);
            break;
          }
          case 10: {
            chunks.push(-4);
            column = 1;
            break;
          }
          default: {
            atCarriageReturn = true;
            column = 1;
          }
        }
      }
      startPosition = endPosition + 1;
    }
    if (end) {
      if (atCarriageReturn) chunks.push(-5);
      if (buffer) chunks.push(buffer);
      chunks.push(null);
    }
    return chunks;
  }
}

// node_modules/micromark-util-decode-string/index.js
var characterEscapeOrReference = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function decodeString(value) {
  return value.replace(characterEscapeOrReference, decode);
}
function decode($0, $1, $2) {
  if ($1) {
    return $1;
  }
  const head = $2.charCodeAt(0);
  if (head === 35) {
    const head2 = $2.charCodeAt(1);
    const hex = head2 === 120 || head2 === 88;
    return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10);
  }
  return decodeNamedCharacterReference($2) || $0;
}

// node_modules/unist-util-stringify-position/lib/index.js
function stringifyPosition(value) {
  if (!value || typeof value !== "object") {
    return "";
  }
  if ("position" in value || "type" in value) {
    return position(value.position);
  }
  if ("start" in value || "end" in value) {
    return position(value);
  }
  if ("line" in value || "column" in value) {
    return point(value);
  }
  return "";
}
function point(point3) {
  return index(point3 && point3.line) + ":" + index(point3 && point3.column);
}
function position(pos) {
  return point(pos && pos.start) + "-" + point(pos && pos.end);
}
function index(value) {
  return value && typeof value === "number" ? value : 1;
}

// node_modules/mdast-util-from-markdown/lib/index.js
var own = {}.hasOwnProperty;
function fromMarkdown(value, encoding, options) {
  if (encoding && typeof encoding === "object") {
    options = encoding;
    encoding = void 0;
  }
  return compiler(options)(postprocess(parse2(options).document().write(preprocess()(value, encoding, true))));
}
function compiler(options) {
  const config = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: opener(link),
      autolinkProtocol: onenterdata,
      autolinkEmail: onenterdata,
      atxHeading: opener(heading),
      blockQuote: opener(blockQuote2),
      characterEscape: onenterdata,
      characterReference: onenterdata,
      codeFenced: opener(codeFlow),
      codeFencedFenceInfo: buffer,
      codeFencedFenceMeta: buffer,
      codeIndented: opener(codeFlow, buffer),
      codeText: opener(codeText2, buffer),
      codeTextData: onenterdata,
      data: onenterdata,
      codeFlowValue: onenterdata,
      definition: opener(definition2),
      definitionDestinationString: buffer,
      definitionLabelString: buffer,
      definitionTitleString: buffer,
      emphasis: opener(emphasis),
      hardBreakEscape: opener(hardBreak),
      hardBreakTrailing: opener(hardBreak),
      htmlFlow: opener(html, buffer),
      htmlFlowData: onenterdata,
      htmlText: opener(html, buffer),
      htmlTextData: onenterdata,
      image: opener(image),
      label: buffer,
      link: opener(link),
      listItem: opener(listItem),
      listItemValue: onenterlistitemvalue,
      listOrdered: opener(list2, onenterlistordered),
      listUnordered: opener(list2),
      paragraph: opener(paragraph),
      reference: onenterreference,
      referenceString: buffer,
      resourceDestinationString: buffer,
      resourceTitleString: buffer,
      setextHeading: opener(heading),
      strong: opener(strong),
      thematicBreak: opener(thematicBreak2)
    },
    exit: {
      atxHeading: closer(),
      atxHeadingSequence: onexitatxheadingsequence,
      autolink: closer(),
      autolinkEmail: onexitautolinkemail,
      autolinkProtocol: onexitautolinkprotocol,
      blockQuote: closer(),
      characterEscapeValue: onexitdata,
      characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
      characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
      characterReferenceValue: onexitcharacterreferencevalue,
      characterReference: onexitcharacterreference,
      codeFenced: closer(onexitcodefenced),
      codeFencedFence: onexitcodefencedfence,
      codeFencedFenceInfo: onexitcodefencedfenceinfo,
      codeFencedFenceMeta: onexitcodefencedfencemeta,
      codeFlowValue: onexitdata,
      codeIndented: closer(onexitcodeindented),
      codeText: closer(onexitcodetext),
      codeTextData: onexitdata,
      data: onexitdata,
      definition: closer(),
      definitionDestinationString: onexitdefinitiondestinationstring,
      definitionLabelString: onexitdefinitionlabelstring,
      definitionTitleString: onexitdefinitiontitlestring,
      emphasis: closer(),
      hardBreakEscape: closer(onexithardbreak),
      hardBreakTrailing: closer(onexithardbreak),
      htmlFlow: closer(onexithtmlflow),
      htmlFlowData: onexitdata,
      htmlText: closer(onexithtmltext),
      htmlTextData: onexitdata,
      image: closer(onexitimage),
      label: onexitlabel,
      labelText: onexitlabeltext,
      lineEnding: onexitlineending,
      link: closer(onexitlink),
      listItem: closer(),
      listOrdered: closer(),
      listUnordered: closer(),
      paragraph: closer(),
      referenceString: onexitreferencestring,
      resourceDestinationString: onexitresourcedestinationstring,
      resourceTitleString: onexitresourcetitlestring,
      resource: onexitresource,
      setextHeading: closer(onexitsetextheading),
      setextHeadingLineSequence: onexitsetextheadinglinesequence,
      setextHeadingText: onexitsetextheadingtext,
      strong: closer(),
      thematicBreak: closer()
    }
  };
  configure(config, (options || {}).mdastExtensions || []);
  const data = {};
  return compile;
  function compile(events) {
    let tree = {
      type: "root",
      children: []
    };
    const context = {
      stack: [tree],
      tokenStack: [],
      config,
      enter,
      exit: exit2,
      buffer,
      resume,
      data
    };
    const listStack = [];
    let index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][1].type === "listOrdered" || events[index2][1].type === "listUnordered") {
        if (events[index2][0] === "enter") {
          listStack.push(index2);
        } else {
          const tail = listStack.pop();
          index2 = prepareList(events, tail, index2);
        }
      }
    }
    index2 = -1;
    while (++index2 < events.length) {
      const handler = config[events[index2][0]];
      if (own.call(handler, events[index2][1].type)) {
        handler[events[index2][1].type].call(Object.assign({
          sliceSerialize: events[index2][2].sliceSerialize
        }, context), events[index2][1]);
      }
    }
    if (context.tokenStack.length > 0) {
      const tail = context.tokenStack[context.tokenStack.length - 1];
      const handler = tail[1] || defaultOnError;
      handler.call(context, void 0, tail[0]);
    }
    tree.position = {
      start: point2(events.length > 0 ? events[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: point2(events.length > 0 ? events[events.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    };
    index2 = -1;
    while (++index2 < config.transforms.length) {
      tree = config.transforms[index2](tree) || tree;
    }
    return tree;
  }
  function prepareList(events, start, length) {
    let index2 = start - 1;
    let containerBalance = -1;
    let listSpread = false;
    let listItem2;
    let lineIndex;
    let firstBlankLineIndex;
    let atMarker;
    while (++index2 <= length) {
      const event = events[index2];
      switch (event[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          if (event[0] === "enter") {
            containerBalance++;
          } else {
            containerBalance--;
          }
          atMarker = void 0;
          break;
        }
        case "lineEndingBlank": {
          if (event[0] === "enter") {
            if (listItem2 && !atMarker && !containerBalance && !firstBlankLineIndex) {
              firstBlankLineIndex = index2;
            }
            atMarker = void 0;
          }
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace": {
          break;
        }
        default: {
          atMarker = void 0;
        }
      }
      if (!containerBalance && event[0] === "enter" && event[1].type === "listItemPrefix" || containerBalance === -1 && event[0] === "exit" && (event[1].type === "listUnordered" || event[1].type === "listOrdered")) {
        if (listItem2) {
          let tailIndex = index2;
          lineIndex = void 0;
          while (tailIndex--) {
            const tailEvent = events[tailIndex];
            if (tailEvent[1].type === "lineEnding" || tailEvent[1].type === "lineEndingBlank") {
              if (tailEvent[0] === "exit") continue;
              if (lineIndex) {
                events[lineIndex][1].type = "lineEndingBlank";
                listSpread = true;
              }
              tailEvent[1].type = "lineEnding";
              lineIndex = tailIndex;
            } else if (tailEvent[1].type === "linePrefix" || tailEvent[1].type === "blockQuotePrefix" || tailEvent[1].type === "blockQuotePrefixWhitespace" || tailEvent[1].type === "blockQuoteMarker" || tailEvent[1].type === "listItemIndent") {
            } else {
              break;
            }
          }
          if (firstBlankLineIndex && (!lineIndex || firstBlankLineIndex < lineIndex)) {
            listItem2._spread = true;
          }
          listItem2.end = Object.assign({}, lineIndex ? events[lineIndex][1].start : event[1].end);
          events.splice(lineIndex || index2, 0, ["exit", listItem2, event[2]]);
          index2++;
          length++;
        }
        if (event[1].type === "listItemPrefix") {
          const item = {
            type: "listItem",
            _spread: false,
            start: Object.assign({}, event[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          listItem2 = item;
          events.splice(index2, 0, ["enter", item, event[2]]);
          index2++;
          length++;
          firstBlankLineIndex = void 0;
          atMarker = true;
        }
      }
    }
    events[start][1]._spread = listSpread;
    return length;
  }
  function opener(create, and) {
    return open;
    function open(token) {
      enter.call(this, create(token), token);
      if (and) and.call(this, token);
    }
  }
  function buffer() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function enter(node2, token, errorHandler) {
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent.children;
    siblings.push(node2);
    this.stack.push(node2);
    this.tokenStack.push([token, errorHandler || void 0]);
    node2.position = {
      start: point2(token.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function closer(and) {
    return close;
    function close(token) {
      if (and) and.call(this, token);
      exit2.call(this, token);
    }
  }
  function exit2(token, onExitError) {
    const node2 = this.stack.pop();
    const open = this.tokenStack.pop();
    if (!open) {
      throw new Error("Cannot close `" + token.type + "` (" + stringifyPosition({
        start: token.start,
        end: token.end
      }) + "): it\u2019s not open");
    } else if (open[0].type !== token.type) {
      if (onExitError) {
        onExitError.call(this, token, open[0]);
      } else {
        const handler = open[1] || defaultOnError;
        handler.call(this, token, open[0]);
      }
    }
    node2.position.end = point2(token.end);
  }
  function resume() {
    return toString(this.stack.pop());
  }
  function onenterlistordered() {
    this.data.expectingFirstListItemValue = true;
  }
  function onenterlistitemvalue(token) {
    if (this.data.expectingFirstListItemValue) {
      const ancestor = this.stack[this.stack.length - 2];
      ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
      this.data.expectingFirstListItemValue = void 0;
    }
  }
  function onexitcodefencedfenceinfo() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.lang = data2;
  }
  function onexitcodefencedfencemeta() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.meta = data2;
  }
  function onexitcodefencedfence() {
    if (this.data.flowCodeInside) return;
    this.buffer();
    this.data.flowCodeInside = true;
  }
  function onexitcodefenced() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
    this.data.flowCodeInside = void 0;
  }
  function onexitcodeindented() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/(\r?\n|\r)$/g, "");
  }
  function onexitdefinitionlabelstring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
  }
  function onexitdefinitiontitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitdefinitiondestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitatxheadingsequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    if (!node2.depth) {
      const depth = this.sliceSerialize(token).length;
      node2.depth = depth;
    }
  }
  function onexitsetextheadingtext() {
    this.data.setextHeadingSlurpLineEnding = true;
  }
  function onexitsetextheadinglinesequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    node2.depth = this.sliceSerialize(token).codePointAt(0) === 61 ? 1 : 2;
  }
  function onexitsetextheading() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function onenterdata(token) {
    const node2 = this.stack[this.stack.length - 1];
    const siblings = node2.children;
    let tail = siblings[siblings.length - 1];
    if (!tail || tail.type !== "text") {
      tail = text3();
      tail.position = {
        start: point2(token.start),
        // @ts-expect-error: we’ll add `end` later.
        end: void 0
      };
      siblings.push(tail);
    }
    this.stack.push(tail);
  }
  function onexitdata(token) {
    const tail = this.stack.pop();
    tail.value += this.sliceSerialize(token);
    tail.position.end = point2(token.end);
  }
  function onexitlineending(token) {
    const context = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const tail = context.children[context.children.length - 1];
      tail.position.end = point2(token.end);
      this.data.atHardBreak = void 0;
      return;
    }
    if (!this.data.setextHeadingSlurpLineEnding && config.canContainEols.includes(context.type)) {
      onenterdata.call(this, token);
      onexitdata.call(this, token);
    }
  }
  function onexithardbreak() {
    this.data.atHardBreak = true;
  }
  function onexithtmlflow() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexithtmltext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitcodetext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitlink() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitimage() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitlabeltext(token) {
    const string4 = this.sliceSerialize(token);
    const ancestor = this.stack[this.stack.length - 2];
    ancestor.label = decodeString(string4);
    ancestor.identifier = normalizeIdentifier(string4).toLowerCase();
  }
  function onexitlabel() {
    const fragment = this.stack[this.stack.length - 1];
    const value = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    this.data.inReference = true;
    if (node2.type === "link") {
      const children = fragment.children;
      node2.children = children;
    } else {
      node2.alt = value;
    }
  }
  function onexitresourcedestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitresourcetitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitresource() {
    this.data.inReference = void 0;
  }
  function onenterreference() {
    this.data.referenceType = "collapsed";
  }
  function onexitreferencestring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
    this.data.referenceType = "full";
  }
  function onexitcharacterreferencemarker(token) {
    this.data.characterReferenceType = token.type;
  }
  function onexitcharacterreferencevalue(token) {
    const data2 = this.sliceSerialize(token);
    const type = this.data.characterReferenceType;
    let value;
    if (type) {
      value = decodeNumericCharacterReference(data2, type === "characterReferenceMarkerNumeric" ? 10 : 16);
      this.data.characterReferenceType = void 0;
    } else {
      const result = decodeNamedCharacterReference(data2);
      value = result;
    }
    const tail = this.stack[this.stack.length - 1];
    tail.value += value;
  }
  function onexitcharacterreference(token) {
    const tail = this.stack.pop();
    tail.position.end = point2(token.end);
  }
  function onexitautolinkprotocol(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = this.sliceSerialize(token);
  }
  function onexitautolinkemail(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = "mailto:" + this.sliceSerialize(token);
  }
  function blockQuote2() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function codeFlow() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function codeText2() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function definition2() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function emphasis() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function heading() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function hardBreak() {
    return {
      type: "break"
    };
  }
  function html() {
    return {
      type: "html",
      value: ""
    };
  }
  function image() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function link() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function list2(token) {
    return {
      type: "list",
      ordered: token.type === "listOrdered",
      start: null,
      spread: token._spread,
      children: []
    };
  }
  function listItem(token) {
    return {
      type: "listItem",
      spread: token._spread,
      checked: null,
      children: []
    };
  }
  function paragraph() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function strong() {
    return {
      type: "strong",
      children: []
    };
  }
  function text3() {
    return {
      type: "text",
      value: ""
    };
  }
  function thematicBreak2() {
    return {
      type: "thematicBreak"
    };
  }
}
function point2(d) {
  return {
    line: d.line,
    column: d.column,
    offset: d.offset
  };
}
function configure(combined, extensions) {
  let index2 = -1;
  while (++index2 < extensions.length) {
    const value = extensions[index2];
    if (Array.isArray(value)) {
      configure(combined, value);
    } else {
      extension(combined, value);
    }
  }
}
function extension(combined, extension2) {
  let key;
  for (key in extension2) {
    if (own.call(extension2, key)) {
      switch (key) {
        case "canContainEols": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "transforms": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "enter":
        case "exit": {
          const right = extension2[key];
          if (right) {
            Object.assign(combined[key], right);
          }
          break;
        }
      }
    }
  }
}
function defaultOnError(left, right) {
  if (left) {
    throw new Error("Cannot close `" + left.type + "` (" + stringifyPosition({
      start: left.start,
      end: left.end
    }) + "): a different token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is open");
  } else {
    throw new Error("Cannot close document, a token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is still open");
  }
}

// src/parsers/source-location.ts
function lineStarts(text3) {
  const starts = [0];
  for (let i = 0; i < text3.length; i++) {
    if (text3.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}
function lineAt(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
function frontmatterLocation(path, field, sourceRevision) {
  return { path, kind: "frontmatter", field, sourceRevision };
}
function bodyLocation(path, starts, start, end, sourceRevision) {
  return {
    path,
    kind: "body",
    range: { start, end },
    line: lineAt(starts, start),
    sourceRevision
  };
}

// src/parsers/body-relations.ts
var LINE = /^\r?(derived_from|repeats_in|observed_in)[ \t]*:[ \t]*\[\[([^\[\]\n]+?)\]\][ \t]*\r?$/;
function excludedInlineRanges(para) {
  const ranges = [];
  const visit3 = (node2) => {
    if (node2.type === "inlineCode" || node2.type === "emphasis" || node2.type === "strong" || node2.type === "delete" || node2.type === "html" || node2.type === "link" || node2.type === "image" || node2.type === "imageReference" || node2.type === "linkReference") {
      const pos = node2.position;
      if (pos?.start.offset !== void 0 && pos?.end.offset !== void 0) {
        ranges.push([pos.start.offset, pos.end.offset]);
      }
      return;
    }
    if ("children" in node2 && Array.isArray(node2.children)) {
      for (const child of node2.children) visit3(child);
    }
  };
  visit3(para);
  return ranges;
}
function overlaps(range, excluded) {
  for (const [exStart, exEnd] of excluded) {
    if (range[0] < exEnd && range[1] > exStart) return true;
  }
  return false;
}
function paragraphHasHtml(para) {
  let has = false;
  const visit3 = (node2) => {
    if (node2.type === "html") {
      has = true;
      return;
    }
    if ("children" in node2 && Array.isArray(node2.children)) {
      for (const child of node2.children) visit3(child);
    }
  };
  visit3(para);
  return has;
}
var VOID_ELEMENTS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;
function computeHtmlEvents(tree, astOffsetBase, content3) {
  const events = [];
  const visitNode = (node2) => {
    if (node2 === null || node2 === void 0) return;
    const n = node2;
    if (n.type === "html" && n.position?.start?.offset !== void 0) {
      const start = n.position.start.offset + astOffsetBase;
      const end = (n.position.end?.offset ?? 0) + astOffsetBase;
      const text3 = content3.slice(start, end);
      const trimmed = text3.trim();
      if (trimmed.startsWith("<!--") && trimmed.endsWith("-->")) {
      } else {
        TAG_RE.lastIndex = 0;
        let m;
        while ((m = TAG_RE.exec(text3)) !== null) {
          const isClose = m[1] === "/";
          const tag = m[2].toLowerCase();
          if (VOID_ELEMENTS.has(tag)) continue;
          events.push({ offset: start + m.index, delta: isClose ? -1 : 1 });
        }
      }
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) visitNode(child);
    }
  };
  for (const node2 of tree.children) visitNode(node2);
  events.sort((a, b) => a.offset - b.offset);
  return events;
}
function htmlDepthAt(events, offset) {
  let depth = 0;
  for (const e of events) {
    if (e.offset >= offset) break;
    depth += e.delta;
  }
  return Math.max(0, depth);
}
function extractBodyRelations(content3, path, revision) {
  const assertions = [];
  const ordinaryLinks = [];
  const diagnostics = [];
  const starts = lineStarts(content3);
  const hasBom = content3.charCodeAt(0) === 65279;
  const parseSource = hasBom ? content3.slice(1) : content3;
  const astOffsetBase = hasBom ? 1 : 0;
  const tree = fromMarkdown(parseSource);
  const htmlEvents = computeHtmlEvents(tree, astOffsetBase, content3);
  for (const node2 of tree.children) {
    if (node2.type !== "paragraph") continue;
    const para = node2;
    const pos = para.position;
    if (!pos || pos.start.offset === void 0 || pos.end.offset === void 0) {
      continue;
    }
    if (paragraphHasHtml(para)) continue;
    const excluded = excludedInlineRanges(para);
    const paraStart = pos.start.offset + astOffsetBase;
    const paraEnd = pos.end.offset + astOffsetBase;
    const slice = content3.slice(paraStart, paraEnd);
    const lines = slice.split("\n");
    let offset = paraStart;
    for (const line of lines) {
      const lineStart = offset;
      const crlfAdjust = line.endsWith("\r") ? 1 : 0;
      const declLength = line.length - crlfAdjust;
      const lineEnd = offset + declLength;
      const match = LINE.exec(line);
      if (match !== null) {
        if (htmlDepthAt(htmlEvents, lineStart) === 0 && !overlaps([lineStart, lineEnd], excluded)) {
          const predicate = match[1];
          if (!validateInternalLinkTarget(match[2])) {
            diagnostics.push({
              code: "body-relation-invalid-link",
              message: `invalid internal link target on a ${predicate} line`,
              path
            });
          } else {
            const link = parseWikilink(match[2]);
            if (link !== null && BODY_RELATION_PREDICATES.includes(predicate)) {
              assertions.push({
                predicate,
                link,
                location: bodyLocation(path, starts, lineStart, lineEnd, revision)
              });
            }
          }
        }
      } else {
        const inner = /\[\[([^\[\]\n]+?)\]\]/g;
        let m;
        while ((m = inner.exec(line)) !== null) {
          const linkStart = lineStart + m.index;
          if (!overlaps([linkStart, linkStart + m[0].length], excluded)) {
            if (validateInternalLinkTarget(m[1])) {
              ordinaryLinks.push(m[1]);
            }
          }
        }
      }
      offset += line.length + 1;
    }
  }
  return { assertions, ordinaryLinks, fileSuppressed: false, diagnostics };
}

// src/parsers/object-parser.ts
var KNOWN_STATUSES = /* @__PURE__ */ new Set([
  "active",
  "closed",
  "unverified",
  "verified",
  "open",
  "supported",
  "refuted",
  "broken",
  "archived",
  "invalid"
]);
function firstTitle(content3) {
  for (const line of content3.split("\n")) {
    if (line.startsWith("# ")) return line.slice(2).trim();
  }
  return "";
}
function toAssertion(entry2, path, revision) {
  return {
    predicate: entry2.predicate,
    link: entry2.link,
    location: frontmatterLocation(path, entry2.predicate, revision)
  };
}
function parseObject(path, content3, mtime, revision) {
  const diagnostics = [];
  const fm = parseFrontmatter(content3, path);
  diagnostics.push(...fm.diagnostics);
  const typeRaw = fm.fields["type"];
  if (typeof typeRaw !== "string" || !RD_OBJECT_TYPES.includes(typeRaw)) {
    return { object: null, assertions: [], ordinaryLinks: [] };
  }
  const type = typeRaw;
  const idRaw = fm.fields["id"];
  let id = null;
  if (typeof idRaw === "string" && idRaw.trim().length > 0) {
    id = idRaw.trim();
  } else {
    diagnostics.push({
      code: "missing-id",
      message: "RD object has no id; no id will be generated",
      path
    });
  }
  const status = typeof fm.fields["status"] === "string" ? fm.fields["status"] : "";
  if (status && !KNOWN_STATUSES.has(status)) {
    diagnostics.push({
      code: "unknown-status",
      message: `unknown status: ${status}`,
      path
    });
  }
  const tags = Array.isArray(fm.fields["tags"]) ? fm.fields["tags"].filter((t) => typeof t === "string") : [];
  const object = {
    path,
    id,
    type,
    status,
    title: firstTitle(content3) || (id ?? path),
    tags,
    created: typeof fm.fields["created"] === "string" ? fm.fields["created"] : null,
    lastVerified: typeof fm.fields["last_verified"] === "string" ? fm.fields["last_verified"] : null,
    mtime,
    demo: tags.includes("rd/demo") || fm.fields["demo"] === true,
    proof: tags.some((t) => t.startsWith("rd/proof/")),
    revision,
    diagnostics
  };
  const assertions = fm.relations.map((e) => toAssertion(e, path, revision));
  const body = extractBodyRelations(content3, path, revision);
  diagnostics.push(...body.diagnostics);
  if (fm.fileSuppressed || body.fileSuppressed) {
    return { object, assertions: [], ordinaryLinks: body.ordinaryLinks };
  }
  assertions.push(...body.assertions);
  return { object, assertions, ordinaryLinks: body.ordinaryLinks };
}

// src/platform/obsidian-navigation.ts
var ObsidianNavigationPort = class {
  constructor(app) {
    this.app = app;
  }
  activeSurface() {
    const leaf = this.app.workspace.activeLeaf;
    if (leaf === null) return "editor";
    return leaf.view.getViewType() === "rd-context" ? "rd-context" : "editor";
  }
  async open(target, mode) {
    const file = this.app.vault.getAbstractFileByPath(target.path);
    if (!(file instanceof import_obsidian.TFile)) return;
    const leaf = this.pickLeaf(mode);
    if (leaf === null) return;
    try {
      await leaf.openFile(file);
      if (mode === "source" || target.subpath !== void 0) {
        await this.app.workspace.revealLeaf(leaf);
      }
      const view = leaf.view;
      if (!(view instanceof import_obsidian.MarkdownView) || view.file?.path !== file.path) return;
      if (mode === "source") {
        if (target.sourceRevision === void 0 || target.sourceLocator === void 0) return;
        const current = await this.app.vault.read(file);
        if (leaf.view !== view || view.file?.path !== file.path) return;
        const buffer = view.editor.getValue();
        const content3 = buffer === current ? current : buffer;
        const assertions = parseObject(
          file.path,
          content3,
          file.stat.mtime,
          target.sourceRevision
        ).assertions;
        const locator = target.sourceLocator;
        const matches = assertions.filter((a) => a.location.kind === "body" && a.predicate === locator.predicate && a.link.raw === locator.raw);
        if (matches.length === 1 && matches[0].location.line !== void 0) {
          view.editor.setCursor({ line: matches[0].location.line - 1, ch: 0 });
        }
      } else if (target.subpath) {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache === null) return;
        const subpath = target.subpath.startsWith("^") ? "#" + target.subpath : target.subpath;
        const resolved = (0, import_obsidian.resolveSubpath)(cache, subpath);
        if (resolved !== null) {
          view.editor.setCursor({ line: resolved.start.line, ch: resolved.start.col });
        }
      }
    } catch {
    }
  }
  /** v0.4.4 §17 + GI-01/GI-03 repair: restrained native Local Graph
   * handoff. The only structural cast (command registry lookup) lives
   * HERE, runtime shape-guarded, never exposed to projections/views.
   * The requested path is opened as the EXACT TFile via leaf/file
   * APIs — never as linktext, so filesystem paths containing `#`
   * cannot be reinterpreted and no note can ever be created. The
   * command dispatch result must be an explicit success. */
  async openLocalGraph(path) {
    const commands = this.app.commands;
    if (commands === void 0 || typeof commands.executeCommandById !== "function") {
      return "UNAVAILABLE";
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian.TFile)) return "UNAVAILABLE";
    try {
      const leaf = this.app.workspace.getLeaf(false);
      if (leaf === null) return "UNAVAILABLE";
      await leaf.openFile(file);
      this.app.workspace.revealLeaf(leaf);
      const active = this.app.workspace.getActiveFile();
      if (active === null || active.path !== path) return "UNAVAILABLE";
      const result = await commands.executeCommandById(NATIVE_LOCAL_GRAPH_COMMAND_ID);
      if (result !== true) return "UNAVAILABLE";
      return "OPENED";
    } catch {
      return "UNAVAILABLE";
    }
  }
  pickLeaf(mode) {
    const ws = this.app.workspace;
    const active = ws.activeLeaf;
    const contextFocused = active !== null && active.view.getViewType() === "rd-context";
    if (mode === "tab") return ws.getLeaf(true);
    if (mode === "split") return ws.getLeaf("split");
    if (contextFocused) {
      const markdownLeaves = ws.getLeavesOfType("markdown");
      if (markdownLeaves.length > 0) return markdownLeaves[0];
      return ws.getLeaf(false);
    }
    return ws.getLeaf(false);
  }
};

// src/index/relation-normalizer.ts
var REVERSE = {
  related: { predicate: "related", swap: false },
  supports: { predicate: "supports", swap: false },
  supported_by: { predicate: "supports", swap: true },
  contradicts: { predicate: "contradicts", swap: false },
  contradicted_by: { predicate: "contradicts", swap: true },
  derived_from: { predicate: "derived_from", swap: false },
  repeats_in: { predicate: "repeats_in", swap: false },
  observed_in: { predicate: "observed_in", swap: false }
};
function resolveEndpoint(link, candidatePaths, idByPath) {
  const resolution = resolveLink(link, candidatePaths);
  if (resolution.state === "RESOLVED" && resolution.paths.length > 0) {
    const path = resolution.paths[0];
    return { path, objectId: idByPath.get(path) ?? null, resolution: "RESOLVED" };
  }
  return { path: "", objectId: null, resolution: resolution.state };
}
function normalizeAssertion(sourcePath, sourceId, assertion, candidatePaths, idByPath) {
  const rule = REVERSE[assertion.predicate];
  const endpoint = resolveEndpoint(
    assertion.link,
    candidatePaths,
    idByPath ?? /* @__PURE__ */ new Map()
  );
  const declarer = {
    objectId: sourceId,
    raw: sourcePath,
    path: sourcePath,
    resolution: "RESOLVED"
  };
  const referenced = {
    objectId: endpoint.objectId,
    raw: assertion.link.targetName,
    path: endpoint.path || null,
    resolution: endpoint.resolution
  };
  const source = rule.swap ? referenced : declarer;
  const target = rule.swap ? declarer : referenced;
  return {
    source,
    target,
    sourcePath: source.path ?? "",
    sourceId: source.objectId ?? "",
    predicate: rule.predicate,
    // Compatibility display field only; identity lives in target.objectId.
    targetId: target.objectId ?? target.raw,
    targetObjectId: target.objectId,
    targetRaw: target.raw,
    targetPaths: target.path ? [target.path] : [],
    targetResolution: endpoint.resolution,
    assertion
  };
}
function endpointKey(endpoint) {
  return endpoint.path !== null ? JSON.stringify(["file", endpoint.path, endpoint.objectId]) : JSON.stringify(["unresolved", endpoint.resolution, endpoint.raw]);
}
function normalizeRelations(items) {
  const byKey = /* @__PURE__ */ new Map();
  for (const item of items) {
    const endpoints = [endpointKey(item.source), endpointKey(item.target)];
    if (item.predicate === "related") endpoints.sort();
    const key = JSON.stringify([item.predicate, ...endpoints]);
    const existing = byKey.get(key);
    if (existing) {
      existing.assertions.push(item.assertion);
      if (item.targetPaths.length > 0 && existing.targetPaths.length === 0) {
        existing.targetPaths = item.targetPaths;
        existing.targetResolution = item.targetResolution;
      }
      continue;
    }
    byKey.set(key, {
      key,
      predicate: item.predicate,
      source: item.source,
      target: item.target,
      sourcePath: item.sourcePath,
      sourceId: item.sourceId,
      targetObjectId: item.targetObjectId,
      targetRaw: item.targetRaw,
      targetId: item.targetId,
      targetPaths: item.targetPaths,
      targetResolution: item.targetResolution,
      assertions: [item.assertion]
    });
  }
  return [...byKey.values()];
}

// src/index/dependency-map.ts
var DependencyMap = class {
  constructor() {
    /** dependent path -> set of paths it references (exact when known). */
    this.byDependent = /* @__PURE__ */ new Map();
    /** referenced exact path -> dependents. */
    this.exact = /* @__PURE__ */ new Map();
    /** referenced bare filename -> dependents. */
    this.byFilename = /* @__PURE__ */ new Map();
    /** unresolved reference names -> dependents. */
    this.unresolved = /* @__PURE__ */ new Map();
  }
  setDependencies(path, refs) {
    this.remove(path);
    const own2 = new Set(refs);
    this.byDependent.set(path, own2);
    for (const ref of refs) {
      if (ref.startsWith("/")) {
        addToSet(this.exact, ref.replace(/^\//, ""), path);
        continue;
      }
      if (ref.includes("/")) {
        addToSet(this.exact, ref, path);
        addToSet(this.exact, ref + ".md", path);
        addToSet(this.byFilename, ref.split("/").pop() ?? ref, path);
        continue;
      }
      addToSet(this.byFilename, ref, path);
      addToSet(this.exact, ref + ".md", path);
      addToSet(this.unresolved, ref, path);
    }
  }
  remove(path) {
    const refs = this.byDependent.get(path);
    if (!refs) return;
    for (const ref of refs) {
      removeFromSet(this.exact, ref, path);
      removeFromSet(this.exact, ref.replace(/^\//, ""), path);
      const fname = ref.split("/").pop() ?? ref;
      removeFromSet(this.byFilename, fname, path);
      removeFromSet(this.unresolved, ref, path);
    }
    this.byDependent.delete(path);
  }
  /** Paths whose parse output could change because `changed` was
   * renamed/deleted/modified: the file itself plus dependents. */
  affectedBy(changed) {
    const norm = changed.replace(/\\/g, "/");
    const affected = /* @__PURE__ */ new Set([norm]);
    for (const dep of this.exact.get(norm) ?? []) affected.add(dep);
    const fname = norm.split("/").pop() ?? norm;
    for (const dep of this.byFilename.get(fname) ?? []) affected.add(dep);
    return affected;
  }
};
function addToSet(map2, key, value) {
  const set2 = map2.get(key);
  if (set2) set2.add(value);
  else map2.set(key, /* @__PURE__ */ new Set([value]));
}
function removeFromSet(map2, key, value) {
  const set2 = map2.get(key);
  if (!set2) return;
  set2.delete(value);
  if (set2.size === 0) map2.delete(key);
}

// src/index/rd-index.ts
var RDIndex = class {
  constructor(adapter) {
    this.files = /* @__PURE__ */ new Map();
    this.depMap = new DependencyMap();
    /** RD-03: per-path latest read token. */
    this.readTokens = /* @__PURE__ */ new Map();
    /** RD-03/04: tombstoned path identities (deleted/renamed-away). */
    this.tombstones = /* @__PURE__ */ new Set();
    this.stateValue = "INDEXING";
    this.lifecycle = 0;
    this.revisionCounter = 0;
    this.readCount = 0;
    this.relationsValue = [];
    this.commitListeners = /* @__PURE__ */ new Set();
    this.ordinaryOutgoingValue = /* @__PURE__ */ new Map();
    this.ordinaryIncomingValue = /* @__PURE__ */ new Map();
    this.adapter = adapter;
  }
  get state() {
    return this.stateValue;
  }
  get lifecycleGeneration() {
    return this.lifecycle;
  }
  get adapterReads() {
    return this.readCount;
  }
  get relations() {
    return this.relationsValue;
  }
  /** v0.4.2 §14/§16: read-only commit notification for projections
   * (Investigation Dashboard). Listeners fire after every completed
   * index commit (build/create/modify/delete/rename). Listener errors
   * never break the index. */
  subscribe(listener) {
    this.commitListeners.add(listener);
    return () => {
      this.commitListeners.delete(listener);
    };
  }
  notifyCommit() {
    for (const listener of [...this.commitListeners]) {
      try {
        listener();
      } catch {
      }
    }
  }
  /** Phase 1 + Phase 2 build. */
  async build() {
    this.stateValue = "INDEXING";
    const lifecycleAtStart = this.lifecycle;
    const paths = this.adapter.list().filter((p) => isCandidatePath(p) && !isForbiddenDataSource(p));
    for (const path of paths) {
      await this.loadFile(path, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.stateValue = "READY";
    this.notifyCommit();
  }
  /** Backward-compatible delete alias. */
  async applyDeleteAlias(path) {
    await this.applyDelete(path);
  }
  /** Incremental: apply one external file event (create/modify). */
  async applyChange(path, event) {
    const lifecycleAtStart = this.lifecycle;
    this.tombstones.delete(path);
    if (isCandidatePath(path)) {
      await this.loadFile(path, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.notifyCommit();
  }
  /** Delete: tombstone the old path identity immediately; any
   * in-flight read for it is discarded on return. */
  async applyDelete(path) {
    const lifecycleAtStart = this.lifecycle;
    this.tombstones.add(path);
    this.bumpToken(path);
    this.files.delete(path);
    this.depMap.remove(path);
    for (const target of this.depMap.affectedBy(path)) {
      if (target === path || !isCandidatePath(target)) continue;
      await this.loadFile(target, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.notifyCommit();
  }
  /** Rename: old path tombstoned, new path loaded, dependents
   * revalidated. */
  async applyRename(oldPath, newPath) {
    const lifecycleAtStart = this.lifecycle;
    this.tombstones.add(oldPath);
    this.bumpToken(oldPath);
    this.files.delete(oldPath);
    this.depMap.remove(oldPath);
    if (isCandidatePath(newPath)) {
      this.tombstones.delete(newPath);
      await this.loadFile(newPath, lifecycleAtStart);
    }
    for (const target of this.depMap.affectedBy(oldPath)) {
      if (target === oldPath || !isCandidatePath(target)) continue;
      await this.loadFile(target, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.notifyCommit();
  }
  /** Bump lifecycle generation: all in-flight reads become stale. */
  dispose() {
    this.lifecycle += 1;
    this.stateValue = "ERROR";
  }
  snapshot() {
    const objects = [];
    const pathsById = /* @__PURE__ */ new Map();
    for (const [path, entry2] of this.files) {
      if (!entry2.object) continue;
      objects.push(entry2.object);
      if (entry2.object.id !== null) {
        const list2 = pathsById.get(entry2.object.id) ?? [];
        list2.push(path);
        pathsById.set(entry2.object.id, list2);
      }
    }
    return { objects, relations: this.relationsValue, pathsById };
  }
  objectAt(path) {
    return this.files.get(path)?.object ?? null;
  }
  ordinaryLinksOf(path) {
    return this.files.get(path)?.ordinaryLinks ?? [];
  }
  /** RD-11 §32: resolve one ordinary link using the SHARED
   * parseWikilink (not raw targetName). Handles alias, heading,
   * block references correctly. */
  ordinaryLinkResolution(_sourcePath, linkRaw) {
    const link = parseWikilink(linkRaw);
    if (link === null) {
      return { state: "BROKEN", paths: [] };
    }
    return resolveLink(link, this.candidatePaths());
  }
  /** Ordinary backlinks to a path (other notes' plain wikilinks). */
  ordinaryBacklinksOf(path) {
    return this.ordinaryIncomingValue.get(path) ?? [];
  }
  relationsFor(path) {
    const obj = this.objectAt(path);
    if (!obj || obj.id === null) return { outgoing: [], incoming: [] };
    const outgoing = [];
    const incoming = [];
    for (const rel of this.relationsValue) {
      if (rel.source.objectId === obj.id && rel.source.path === path) {
        outgoing.push(rel);
      }
      if (rel.target.objectId === obj.id && rel.target.path === path) {
        if (rel.predicate === "related") {
          incoming.push(rel);
        } else if (rel.sourcePath !== path) {
          incoming.push(rel);
        }
      }
    }
    return { outgoing, incoming };
  }
  isTombstoned(path) {
    return this.tombstones.has(path);
  }
  candidatePaths() {
    return [...this.files.keys()];
  }
  bumpToken(path) {
    const next = (this.readTokens.get(path) ?? 0) + 1;
    this.readTokens.set(path, next);
    return next;
  }
  async loadFile(path, lifecycleAtStart) {
    const token = this.bumpToken(path);
    this.readCount += 1;
    let content3;
    try {
      content3 = await this.adapter.read(path);
    } catch {
      return;
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    if (this.readTokens.get(path) !== token) return;
    if (this.tombstones.has(path)) return;
    const revision = ++this.revisionCounter;
    const parsed = parseObject(path, content3, this.adapter.mtime(path), revision);
    this.files.set(path, {
      object: parsed.object,
      assertions: parsed.assertions,
      ordinaryLinks: parsed.ordinaryLinks,
      generation: revision
    });
    const refs = parsed.assertions.map((a) => a.link.targetName);
    this.depMap.setDependencies(path, refs);
  }
  rebuildRelations() {
    const candidates = this.candidatePaths();
    const idByPath = /* @__PURE__ */ new Map();
    for (const [path, entry2] of this.files) {
      if (entry2.object?.id !== null && entry2.object !== null) {
        idByPath.set(path, entry2.object.id);
      }
    }
    const normalized = [];
    for (const [path, entry2] of this.files) {
      const obj = entry2.object;
      if (!obj || obj.id === null) continue;
      for (const assertion of entry2.assertions) {
        normalized.push(
          normalizeAssertion(path, obj.id, assertion, candidates, idByPath)
        );
      }
    }
    this.relationsValue = normalizeRelations(normalized);
    this.rebuildOrdinaryMaps(candidates);
  }
  rebuildOrdinaryMaps(candidates) {
    this.ordinaryOutgoingValue = /* @__PURE__ */ new Map();
    this.ordinaryIncomingValue = /* @__PURE__ */ new Map();
    for (const [path, entry2] of this.files) {
      const unique = [...new Set(entry2.ordinaryLinks)];
      this.ordinaryOutgoingValue.set(path, unique);
      for (const raw of unique) {
        const link = parseWikilink(raw);
        if (link === null) continue;
        const resolution = resolveLink(link, candidates);
        if (resolution.state === "RESOLVED" && resolution.paths.length === 1) {
          const target = resolution.paths[0];
          const list2 = this.ordinaryIncomingValue.get(target) ?? [];
          if (!list2.includes(path)) list2.push(path);
          this.ordinaryIncomingValue.set(target, list2);
        }
      }
    }
  }
};

// src/context/session-state.ts
function freshSessionState() {
  return {
    mode: "FOLLOW",
    pinnedPath: null,
    lastMarkdownAnchor: null,
    pinnedDeleted: false,
    filter: null,
    expandedSections: /* @__PURE__ */ new Set(),
    selectedRelationPath: null
  };
}
function resetSession(state) {
  const fresh = freshSessionState();
  state.mode = fresh.mode;
  state.pinnedPath = fresh.pinnedPath;
  state.lastMarkdownAnchor = fresh.lastMarkdownAnchor;
  state.pinnedDeleted = fresh.pinnedDeleted;
  state.filter = fresh.filter;
  state.expandedSections = fresh.expandedSections;
  state.selectedRelationPath = fresh.selectedRelationPath;
}

// src/context/context-projection.ts
var TYPE_SECTION = {
  evidence: "Related Evidence",
  hypothesis: "Related Hypotheses",
  loop: "Related Loops",
  case: "Other Semantic Relations"
};
function buildProjection(object, outgoing, incoming, indexState, mode, index2, path) {
  const toTypedRow = (rel, direction) => {
    const assertion = rel.assertions[0];
    const endpoint = direction === "outgoing" ? rel.target : rel.source;
    const targetPath = endpoint.path;
    const displayId = endpoint.objectId ?? endpoint.raw;
    return {
      predicate: rel.predicate,
      direction,
      targetId: displayId,
      targetTitle: endpoint.objectId === null ? endpoint.raw : titleFor(index2, targetPath ?? "", displayId),
      targetPath,
      resolution: rel.targetResolution,
      sourcePath: assertion ? assertion.location.path : null,
      sourceLine: assertion?.location.line ?? null,
      sourceRevision: assertion?.location.sourceRevision ?? null,
      sourceLocator: assertion?.location.kind === "body" ? { predicate: assertion.predicate, raw: assertion.link.raw } : void 0,
      alias: null,
      subpath: null,
      ordinary: false
    };
  };
  const outgoingRows = outgoing.map((r) => toTypedRow(r, "outgoing"));
  const incomingRows = incoming.map((r) => toTypedRow(r, "incoming"));
  const ordinaryRows = index2.ordinaryLinksOf(path).map((raw) => {
    const resolution = index2.ordinaryLinkResolution(path, raw);
    const resolvedPath = resolution.state === "RESOLVED" ? resolution.paths[0] ?? null : null;
    const link = raw.includes("|") || raw.includes("#") || raw.includes("^") ? parseWikilink(raw) : null;
    const alias = link?.alias ?? null;
    const subpath = link ? link.heading ? "#" + link.heading : link.block ? "^" + link.block : null : null;
    return {
      predicate: "related",
      direction: "outgoing",
      targetId: link?.targetName ?? raw,
      targetTitle: alias ?? link?.targetName ?? raw,
      targetPath: resolvedPath,
      resolution: resolution.state,
      sourcePath: path,
      sourceLine: null,
      sourceRevision: null,
      alias,
      subpath,
      ordinary: true
    };
  });
  for (const srcPath of index2.ordinaryBacklinksOf(path)) {
    ordinaryRows.push({
      predicate: "related",
      direction: "incoming",
      targetId: srcPath,
      targetTitle: titleFor(index2, srcPath, srcPath),
      targetPath: srcPath,
      resolution: "RESOLVED",
      sourcePath: srcPath,
      sourceLine: null,
      sourceRevision: null,
      alias: null,
      subpath: null,
      ordinary: true
    });
  }
  const data = {
    phase: "READY",
    indexState,
    mode,
    object: {
      id: object.id ?? "(no id)",
      type: object.type,
      title: object.title,
      status: object.status,
      lastVerified: object.lastVerified,
      demo: object.demo,
      proof: object.proof
    },
    sections: []
  };
  const allSemantic = [...outgoingRows, ...incomingRows];
  if (object.type === "case") {
    const bySection = /* @__PURE__ */ new Map();
    const unresolved = [];
    const contradictions = [];
    for (const row of allSemantic) {
      if (row.predicate === "contradicts") contradictions.push(row);
      if (row.resolution === "RESOLVED" && row.targetPath !== null) {
        const targetObj = index2.objectAt(row.targetPath);
        if (targetObj !== null) {
          const title = TYPE_SECTION[targetObj.type] ?? "Other Semantic Relations";
          const list2 = bySection.get(title) ?? [];
          list2.push(row);
          bySection.set(title, list2);
          continue;
        }
      }
      unresolved.push(row);
    }
    for (const [title, rows] of bySection) {
      if (rows.length > 0) {
        data.sections.push({
          key: title.toLowerCase().replace(/ /g, "-"),
          title,
          rows
        });
      }
    }
    if (contradictions.length > 0) {
      data.sections.push({ key: "contradictions", title: "Contradictions", rows: contradictions });
    }
    if (unresolved.length > 0) {
      data.sections.push({ key: "unresolved", title: "Unresolved", rows: unresolved });
    }
    if (ordinaryRows.length > 0) {
      data.sections.push({ key: "other-links", title: "Other Links", rows: ordinaryRows });
    }
    return data;
  }
  data.sections.push({
    key: "relations",
    title: "Relations",
    rows: [...allSemantic, ...ordinaryRows]
  });
  return data;
}
function titleFor(index2, path, fallback) {
  if (!path) return fallback;
  const obj = index2.objectAt(path);
  return obj ? obj.title : fallback;
}

// src/context/context-controller.ts
var ContextController = class {
  constructor(index2, loader = async () => {
  }) {
    this.state = freshSessionState();
    this.phaseValue = "NO_ACTIVE_OBJECT";
    this.projectionValue = null;
    this.requestGeneration = 0;
    this.unloaded = false;
    this.listeners = /* @__PURE__ */ new Set();
    this.pinnedTombstone = null;
    this.index = index2;
    this.loader = loader;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  unsubscribe(listener) {
    this.listeners.delete(listener);
  }
  publish() {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch {
      }
    }
  }
  get session() {
    return this.state;
  }
  get phase() {
    return this.phaseValue;
  }
  get projection() {
    return this.projectionValue;
  }
  get generation() {
    return this.requestGeneration;
  }
  currentTargetPath() {
    if (this.state.mode === "PINNED") return this.state.pinnedPath;
    return this.state.lastMarkdownAnchor;
  }
  async onActiveMarkdown(path) {
    await this.onFileOpen(path);
  }
  async onFileOpen(path) {
    if (path !== null) this.state.lastMarkdownAnchor = path;
    if (this.state.mode === "PINNED") return;
    await this.resolve(path);
  }
  async onActiveLeafChange(activeIsContextView) {
  }
  async onContextFocus() {
  }
  async initializeAnchor(path) {
    if (path !== null) this.state.lastMarkdownAnchor = path;
    if (this.state.mode === "PINNED" && this.state.pinnedPath) {
      if (this.pinnedTombstone === null) await this.resolve(this.state.pinnedPath);
      return;
    }
    await this.resolve(path);
  }
  async pin() {
    const current = this.state.lastMarkdownAnchor;
    if (current === null) return;
    this.state.mode = "PINNED";
    this.state.pinnedPath = current;
    this.state.pinnedDeleted = false;
    this.pinnedTombstone = null;
    await this.resolve(current);
  }
  async unpin() {
    this.state.mode = "FOLLOW";
    this.state.pinnedPath = null;
    this.state.pinnedDeleted = false;
    this.pinnedTombstone = null;
    await this.resolve(this.state.lastMarkdownAnchor);
  }
  async onFileRenamed(oldPath, newPath) {
    if (this.state.lastMarkdownAnchor === oldPath) {
      this.state.lastMarkdownAnchor = newPath;
    }
    if (this.state.mode === "PINNED" && this.state.pinnedPath === oldPath) {
      this.state.pinnedPath = newPath;
    }
    await this.refreshCurrentTarget();
  }
  async onFileDeleted(path) {
    if (this.state.mode === "PINNED" && this.state.pinnedPath === path) {
      const obj = this.index.objectAt(path);
      this.pinnedTombstone = { path, objectId: obj?.id ?? path };
      this.requestGeneration += 1;
      this.state.pinnedDeleted = true;
      this.phaseValue = "ERROR";
      this.projectionValue = {
        phase: "ERROR",
        indexState: this.index.state,
        mode: "PINNED",
        pinnedDeleted: true,
        object: null,
        sections: []
      };
      this.publish();
      return;
    }
    if (this.state.lastMarkdownAnchor === path) {
      this.state.lastMarkdownAnchor = null;
      if (this.state.mode === "FOLLOW") {
        this.requestGeneration += 1;
        this.phaseValue = "NO_ACTIVE_OBJECT";
        this.projectionValue = {
          phase: "NO_ACTIVE_OBJECT",
          indexState: this.index.state,
          mode: "FOLLOW",
          object: null,
          sections: []
        };
        this.publish();
        return;
      }
      await this.refreshCurrentTarget();
      return;
    }
    await this.refreshCurrentTarget();
  }
  async onFileCreated(path) {
    if (this.pinnedTombstone !== null && this.pinnedTombstone.path === path) {
      return;
    }
    await this.refreshCurrentTarget();
  }
  async onIndexRefreshed(changedPath) {
    await this.refreshCurrentTarget();
  }
  async refreshCurrentTarget() {
    if (this.unloaded) return;
    const target = this.currentTargetPath();
    if (target === null) {
      if (this.state.mode === "PINNED" && this.pinnedTombstone !== null) return;
      this.phaseValue = "NO_ACTIVE_OBJECT";
      this.projectionValue = {
        phase: "NO_ACTIVE_OBJECT",
        indexState: this.index.state,
        mode: this.state.mode,
        object: null,
        sections: []
      };
      this.publish();
      return;
    }
    if (this.state.mode === "PINNED" && this.pinnedTombstone !== null) return;
    const object = this.index.objectAt(target);
    if (object === null) {
      if (this.state.mode === "PINNED") {
        this.phaseValue = "ERROR";
        this.projectionValue = {
          phase: "ERROR",
          indexState: this.index.state,
          mode: "PINNED",
          pinnedDeleted: true,
          object: null,
          sections: []
        };
      } else {
        this.phaseValue = "NO_ACTIVE_OBJECT";
        this.projectionValue = {
          phase: "NO_ACTIVE_OBJECT",
          indexState: this.index.state,
          mode: "FOLLOW",
          object: null,
          sections: []
        };
      }
      this.publish();
      return;
    }
    const { outgoing, incoming } = this.index.relationsFor(target);
    this.projectionValue = buildProjection(
      object,
      outgoing,
      incoming,
      this.index.state,
      this.state.mode,
      this.index,
      target
    );
    this.phaseValue = "READY";
    this.publish();
  }
  setSectionExpanded(key, expanded) {
    if (expanded) this.state.expandedSections.add(key);
    else this.state.expandedSections.delete(key);
    this.publish();
  }
  async unload() {
    this.requestGeneration += 1;
    this.unloaded = true;
    resetSession(this.state);
    this.pinnedTombstone = null;
    this.phaseValue = "NO_ACTIVE_OBJECT";
    this.projectionValue = null;
    this.publish();
    this.listeners.clear();
  }
  async reattach() {
    if (this.unloaded) return;
    if (this.state.mode === "PINNED" && this.state.pinnedPath) {
      if (this.pinnedTombstone !== null) return;
      await this.resolve(this.state.pinnedPath);
    } else {
      await this.resolve(this.state.lastMarkdownAnchor);
    }
  }
  async resolve(path) {
    this.requestGeneration += 1;
    const gen = this.requestGeneration;
    if (this.unloaded) return;
    if (path === null) {
      this.phaseValue = "NO_ACTIVE_OBJECT";
      this.projectionValue = {
        phase: "NO_ACTIVE_OBJECT",
        indexState: this.index.state,
        mode: this.state.mode,
        object: null,
        sections: []
      };
      this.publish();
      return;
    }
    this.phaseValue = "LOADING";
    this.publish();
    try {
      await this.loader(path);
      if (gen !== this.requestGeneration || this.unloaded) return;
    } catch {
      if (gen !== this.requestGeneration || this.unloaded) return;
      this.phaseValue = "ERROR";
      this.projectionValue = {
        phase: "ERROR",
        indexState: this.index.state,
        mode: this.state.mode,
        object: null,
        sections: []
      };
      this.publish();
      return;
    }
    if (gen !== this.requestGeneration) return;
    if (this.state.mode === "PINNED" && this.pinnedTombstone !== null) {
      this.phaseValue = "ERROR";
      this.projectionValue = {
        phase: "ERROR",
        indexState: this.index.state,
        mode: "PINNED",
        pinnedDeleted: true,
        object: null,
        sections: []
      };
      this.publish();
      return;
    }
    const object = this.index.objectAt(path);
    if (object === null) {
      this.phaseValue = "NO_ACTIVE_OBJECT";
      this.projectionValue = {
        phase: "NO_ACTIVE_OBJECT",
        indexState: this.index.state,
        mode: this.state.mode,
        object: null,
        sections: []
      };
      this.publish();
      return;
    }
    const { outgoing, incoming } = this.index.relationsFor(path);
    this.projectionValue = buildProjection(
      object,
      outgoing,
      incoming,
      this.index.state,
      this.state.mode,
      this.index,
      path
    );
    this.phaseValue = "READY";
    this.publish();
  }
};

// src/index/update-scheduler.ts
var PendingPathScheduler = class {
  constructor(task, debounceMs = 250, maxWaitMs = 1e3, clock = () => Date.now()) {
    this.task = task;
    this.debounceMs = debounceMs;
    this.maxWaitMs = maxWaitMs;
    this.clock = clock;
    this.pending = /* @__PURE__ */ new Set();
    this.firstSeen = /* @__PURE__ */ new Map();
    this.timer = null;
    this.disposed = false;
    this.nowMs = 0;
  }
  schedule(path) {
    if (this.disposed) return;
    this.nowMs = this.clock();
    if (!this.pending.has(path)) {
      this.firstSeen.set(path, this.nowMs);
    }
    this.pending.add(path);
    this.resetTimer(this.debounceMs);
  }
  resetTimer(delay) {
    if (this.timer !== null) clearTimeout(this.timer);
    const earliestDeadline = this.earliestDeadline();
    const actualDelay = Math.min(delay, earliestDeadline);
    this.timer = setTimeout(() => this.tick(), Math.max(1, actualDelay));
  }
  earliestDeadline() {
    let earliest = this.maxWaitMs;
    for (const [path, seen] of this.firstSeen) {
      const remaining = this.maxWaitMs - (this.nowMs - seen);
      if (remaining < earliest) earliest = remaining;
    }
    return Math.max(0, earliest);
  }
  tick() {
    this.timer = null;
    if (this.disposed || this.pending.size === 0) return;
    this.nowMs = this.clock();
    const fire = [];
    const keep = [];
    for (const path of this.pending) {
      const seen = this.firstSeen.get(path) ?? this.nowMs;
      const age = this.nowMs - seen;
      if (age + this.debounceMs >= this.maxWaitMs) {
        fire.push(path);
      } else {
        keep.push(path);
      }
    }
    this.pending.clear();
    for (const p of keep) this.pending.add(p);
    for (const p of fire) this.firstSeen.delete(p);
    for (const p of fire) void this.task(p);
    if (this.pending.size > 0) {
      this.resetTimer(this.debounceMs);
    }
  }
  flush() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const all2 = [...this.pending];
    this.pending.clear();
    this.firstSeen.clear();
    for (const path of all2) void this.task(path);
  }
  dispose() {
    this.disposed = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
    this.firstSeen.clear();
  }
  get pendingPaths() {
    return [...this.pending];
  }
};

// src/runtime/runtime-wiring.ts
var RuntimeWiring = class {
  constructor(adapter, workspace, vault, navigation) {
    this.scheduler = null;
    this.buildPhase = "BUILDING";
    this.pendingPaths = /* @__PURE__ */ new Set();
    this.disposed = false;
    this.activeFileListeners = /* @__PURE__ */ new Set();
    this.index = new RDIndex(adapter);
    this.controller = new ContextController(this.index);
    this.workspace = workspace;
    this.vault = vault;
    this.navigation = navigation;
  }
  async start() {
    this.registerListeners();
    await this.index.build();
    if (this.disposed) return;
    this.buildPhase = "REPLAYING";
    while (this.pendingPaths.size > 0) {
      if (this.disposed) return;
      const batch = [...this.pendingPaths];
      this.pendingPaths.clear();
      for (const path of batch) {
        await this.index.applyChange(path, "modify");
        if (this.disposed) return;
      }
    }
    if (this.disposed) return;
    this.scheduler = new PendingPathScheduler((p) => void this.applyModify(p));
    if (this.pendingPaths.size > 0) {
      for (const p of this.pendingPaths) this.scheduler.schedule(p);
      this.pendingPaths.clear();
    }
    this.buildPhase = "LIVE";
    await this.workspace.onLayoutReady(async () => {
      if (this.disposed) return;
      const active = this.workspace.getActiveFile();
      if (active !== null) {
        await this.controller.initializeAnchor(active.path);
      }
    });
  }
  dispose() {
    this.disposed = true;
    this.buildPhase = "DISPOSED";
    this.scheduler?.dispose();
    this.pendingPaths.clear();
    void this.controller.unload();
    this.index.dispose();
    this.scheduler = null;
  }
  /** v0.4.2 §16: Dashboard live-update hookup. Delegates to the ONE
   * shared RDIndex commit notification — no second watcher, no
   * polling, no parallel index. */
  onIndexCommit(listener) {
    return this.index.subscribe(listener);
  }
  /** v0.4.3 §17: active-file stream for the LOOP Workspace. Fired
   * from the ONE existing workspace file-open registration — this is
   * another listener on the same event, not a second watcher. */
  onActiveFile(listener) {
    this.activeFileListeners.add(listener);
    return () => {
      this.activeFileListeners.delete(listener);
    };
  }
  notifyActiveFile(path) {
    for (const listener of [...this.activeFileListeners]) {
      try {
        listener(path);
      } catch {
      }
    }
  }
  registerListeners() {
    this.vault.on("create", (file) => {
      if (isCandidatePath(file.path)) this.onPathEvent(file.path, "create");
    });
    this.vault.on("modify", (file) => {
      if (isCandidatePath(file.path)) this.onPathEvent(file.path, "modify");
    });
    this.vault.on("rename", (file, oldPath) => void this.applyRename(oldPath, file.path));
    this.vault.on("delete", (file) => void this.applyDelete(file.path));
    this.workspace.on("file-open", (file) => {
      if (file !== null) void this.controller.onFileOpen(file.path);
      this.notifyActiveFile(file !== null ? file.path : null);
    });
    this.workspace.on("active-leaf-change", () => {
      void this.controller.onActiveLeafChange(false);
    });
  }
  onPathEvent(path, event) {
    if (this.buildPhase === "BUILDING" || this.buildPhase === "REPLAYING") {
      this.pendingPaths.add(path);
      return;
    }
    if (this.buildPhase !== "LIVE") return;
    if (event === "create") {
      void this.applyCreate(path);
    } else {
      this.scheduler?.schedule(path);
    }
  }
  async applyCreate(path) {
    if (this.disposed) return;
    const token = this.disposed;
    await this.index.applyChange(path, "create");
    if (this.disposed !== token || this.disposed) return;
    await this.controller.onFileCreated(path);
  }
  async applyModify(path) {
    if (this.disposed) return;
    await this.index.applyChange(path, "modify");
    if (this.disposed) return;
    await this.controller.onIndexRefreshed(path);
  }
  async applyDelete(path) {
    if (this.disposed) return;
    await this.index.applyDelete(path);
    if (this.disposed) return;
    await this.controller.onFileDeleted(path);
  }
  async applyRename(oldPath, newPath) {
    if (this.disposed) return;
    await this.index.applyRename(oldPath, newPath);
    if (this.disposed) return;
    await this.controller.onFileRenamed(oldPath, newPath);
  }
};

// src/architecture/view-registry.ts
var RDViewRegistry = class {
  constructor() {
    this.registrations = [];
    this.byType = /* @__PURE__ */ new Map();
  }
  add(registration) {
    if (this.byType.has(registration.viewType)) {
      throw new Error(`duplicate RD view type: ${registration.viewType}`);
    }
    this.byType.set(registration.viewType, registration);
    this.registrations.push(registration);
  }
  registrations_() {
    return this.registrations;
  }
  get(viewType) {
    return this.byType.get(viewType);
  }
  /** Replay all registrations onto the host plugin: view factory,
   * optional ribbon, command with explicit activation (reuse the
   * existing leaf of that type, else open a new one). No view is
   * ever activated automatically by registration. */
  registerAll(ctx) {
    for (const reg of this.registrations) {
      ctx.plugin.registerView(reg.viewType, (leaf) => reg.createView(leaf, ctx.services));
      if (reg.ribbonIcon !== void 0) {
        ctx.plugin.addRibbonIcon(reg.ribbonIcon, reg.displayText, () => {
          void activateRDView(ctx.plugin, reg);
        });
      }
      ctx.plugin.addCommand({
        id: reg.commandId,
        name: reg.commandName,
        callback: () => {
          void activateRDView(ctx.plugin, reg);
        }
      });
    }
  }
};
async function activateRDView(plugin, reg) {
  const existing = plugin.app.workspace.getLeavesOfType(reg.viewType);
  const leaf = existing[0] ?? (reg.placement === "right" ? plugin.app.workspace.getRightLeaf(false) : plugin.app.workspace.getLeaf(true));
  if (leaf === null) return;
  await leaf.setViewState({ type: reg.viewType, active: true });
  plugin.app.workspace.revealLeaf(leaf);
}

// src/architecture/workspace-state.ts
var INITIAL = Object.freeze({
  workspaceLabel: "default",
  selectedObjectId: null,
  navigation: Object.freeze([]),
  snapshot: Object.freeze({ state: "not_loaded", note: "not loaded yet" })
});
function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}
var RDWorkspaceStore = class {
  constructor() {
    this.state = INITIAL;
    this.listeners = /* @__PURE__ */ new Set();
    this.disposed = false;
  }
  getState() {
    return this.state;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** UI pointer to the object being inspected. Setting it does not
   * read, validate, resolve or change any knowledge object. */
  setSelectedObject(objectId) {
    this.update({
      selectedObjectId: objectId,
      navigation: objectId === null ? this.state.navigation : [...this.state.navigation, objectId]
    });
  }
  /** Step back along the UI trail; returns to no selection when the
   * trail is exhausted. */
  back() {
    if (this.state.navigation.length === 0) {
      this.update({ selectedObjectId: null });
      return;
    }
    const navigation = this.state.navigation.slice(0, -1);
    this.update({
      navigation,
      selectedObjectId: navigation.length > 0 ? navigation[navigation.length - 1] : null
    });
  }
  /** Display label of the selected logical workspace. Switching it
   * clears the pending inspection context (v1.6.0 §5: explicit
   * workspace switching clears context; no cross-workspace
   * substitution). */
  setWorkspaceLabel(label) {
    this.update({
      workspaceLabel: label,
      selectedObjectId: null,
      navigation: []
    });
  }
  /** Availability of the derived snapshot, as last observed by an
   * explicit read. Presentation state only — never a claim about
   * knowledge validity. */
  setSnapshotAvailability(snapshot) {
    this.update({ snapshot });
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
  }
  update(patch) {
    if (this.disposed) return;
    this.state = deepFreeze({ ...this.state, ...patch });
    for (const listener of [...this.listeners]) listener(this.state);
  }
};

// src/views/rd-workspace-view.ts
var import_obsidian6 = require("obsidian");

// src/semantic-graph/graph-loader.ts
var GRAPH_SCHEMA_TAG = "rd-semantic-graph-projection/1";
var DEFAULT_SEMANTIC_GRAPH_PATH = "semantic-graph/graph.json";
var GRAPH_RELATIONS = [
  "supports",
  "contradicts",
  "derived_from",
  "depends_on",
  "revises",
  "supersedes"
];
function deepFreeze2(value) {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) deepFreeze2(v);
    Object.freeze(value);
  }
  return value;
}
function isString(v) {
  return typeof v === "string";
}
function parseNode(raw) {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw;
  const pred = r.predecessor;
  const succ = r.successor;
  if (!isString(r.object_id) || !isString(r.kind) || !isString(r.status) || !isString(r.title) || pred !== null && !isString(pred) || succ !== null && !isString(succ)) {
    return null;
  }
  return {
    object_id: r.object_id,
    kind: r.kind,
    status: r.status,
    title: r.title,
    predecessor: pred,
    successor: succ
  };
}
function parseEdge(raw) {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw;
  if (!isString(r.source) || !isString(r.target) || !isString(r.relation)) return null;
  if (!GRAPH_RELATIONS.includes(r.relation)) return null;
  return { source: r.source, target: r.target, relation: r.relation };
}
function parseDiagnostic(raw) {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw;
  if (!isString(r.type) || !isString(r.object_id) || !Array.isArray(r.paths)) return null;
  if (!r.paths.every(isString)) return null;
  return { type: r.type, object_id: r.object_id, paths: r.paths };
}
function parseGraphSnapshot(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "invalid", reason: "malformed-json" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { state: "invalid", reason: "invalid-shape" };
  }
  const r = parsed;
  if (r.schema !== GRAPH_SCHEMA_TAG) {
    return { state: "invalid", reason: "unsupported-schema" };
  }
  if (!Array.isArray(r.nodes) || !Array.isArray(r.edges) || !Array.isArray(r.unresolved) || !Array.isArray(r.diagnostics)) {
    return { state: "invalid", reason: "invalid-shape" };
  }
  const nodes = r.nodes.map(parseNode);
  const edges = r.edges.map(parseEdge);
  const unresolved = r.unresolved.map(parseEdge);
  const diagnostics = r.diagnostics.map(parseDiagnostic);
  if (nodes.includes(null) || edges.includes(null) || unresolved.includes(null) || diagnostics.includes(null)) {
    return { state: "invalid", reason: "invalid-shape" };
  }
  return {
    state: "available",
    graph: deepFreeze2({
      schema: GRAPH_SCHEMA_TAG,
      nodes,
      edges,
      unresolved,
      diagnostics
    })
  };
}
async function loadGraphFromSource(source) {
  const read = await source.read();
  if (read.state === "missing") return { state: "missing" };
  if (read.state === "unavailable") return { state: "unavailable", reason: read.reason };
  return parseGraphSnapshot(read.text);
}

// src/semantic-graph/object-resolver.ts
function resolveObject(graph, _workspace, objectId) {
  const matches = graph.nodes.filter((n) => n.object_id === objectId);
  if (matches.length === 1) return { state: "available", node: matches[0] };
  if (matches.length === 0) return { state: "missing" };
  return { state: "ambiguous", matches };
}
function relationSummary(graph, objectId) {
  const ids = new Set(graph.nodes.map((n) => n.object_id));
  const rows = [];
  for (const edge of graph.edges) {
    if (edge.source === objectId) {
      rows.push({
        edge,
        direction: "outgoing",
        otherId: edge.target,
        endpointState: ids.has(edge.target) ? "available" : "missing"
      });
    }
    if (edge.target === objectId) {
      rows.push({
        edge,
        direction: "incoming",
        otherId: edge.source,
        endpointState: ids.has(edge.source) ? "available" : "missing"
      });
    }
  }
  return {
    rows,
    unresolvedFrom: graph.unresolved.filter((e) => e.source === objectId),
    unresolvedTo: graph.unresolved.filter((e) => e.target === objectId)
  };
}
function diagnosticsFor(graph, objectId) {
  if (objectId === void 0) return graph.diagnostics;
  return graph.diagnostics.filter((d) => d.object_id === objectId);
}
function statusOf(graph, objectId) {
  const node2 = graph.nodes.find((n) => n.object_id === objectId);
  return { inSnapshot: node2 !== void 0, status: node2 ? node2.status : null };
}
function entry(graph, objectId, via) {
  const s = statusOf(graph, objectId);
  return { objectId, via, inSnapshot: s.inSnapshot, status: s.status };
}
function buildLineage(graph, objectId) {
  const node2 = graph.nodes.find((n) => n.object_id === objectId);
  const notes = [];
  const previous2 = [];
  const following = [];
  if (node2 !== void 0) {
    if (node2.predecessor !== null) {
      previous2.push(entry(graph, node2.predecessor, "predecessor field"));
    }
    if (node2.successor !== null) {
      following.push(entry(graph, node2.successor, "successor field"));
    }
  }
  for (const edge of graph.edges) {
    if (edge.source !== objectId) continue;
    if (edge.relation === "revises") {
      previous2.push(entry(graph, edge.target, "revises declaration"));
    } else if (edge.relation === "supersedes") {
      previous2.push(entry(graph, edge.target, "supersedes declaration"));
    }
  }
  for (const edge of graph.edges) {
    if (edge.target !== objectId) continue;
    if (edge.relation === "revises") {
      following.push(entry(graph, edge.source, "revised-by reading"));
    } else if (edge.relation === "supersedes") {
      following.push(entry(graph, edge.source, "superseded-by reading"));
    }
  }
  const predIds = new Set(previous2.map((e) => e.objectId));
  const succIds = new Set(following.map((e) => e.objectId));
  if (predIds.size > 1) {
    notes.push(`multiple predecessors declared (${[...predIds].join(", ")}); not reconciled`);
  }
  if (succIds.size > 1) {
    notes.push(
      `multiple following objects (${[...succIds].join(", ")}); all listed, none auto-selected`
    );
  }
  if (node2 !== void 0 && node2.predecessor !== null && !graph.edges.some((e) => e.source === objectId && e.target === node2.predecessor && (e.relation === "revises" || e.relation === "supersedes"))) {
    notes.push(
      `predecessor field (${node2.predecessor}) has no matching revises/supersedes declaration`
    );
  }
  return { previous: previous2, following, notes };
}

// src/views/dom-helpers.ts
function emptyEl(el) {
  while (el.firstChild !== null) el.removeChild(el.firstChild);
}
function createChild(parent, tag, opts) {
  const el = document.createElement(tag);
  if (opts?.cls !== void 0 && opts.cls !== "") el.className = opts.cls;
  if (opts?.text !== void 0) el.textContent = opts.text;
  parent.appendChild(el);
  return el;
}

// src/semantic-graph/knowledge-panel.ts
var NOT_IN_SNAPSHOT = "not in v1.2.1 snapshot";
function deepFreezePanel(value) {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) deepFreezePanel(v);
    Object.freeze(value);
  }
  return value;
}
function emptyDiagnosticsCopy(graphDiagnostics) {
  return graphDiagnostics.map((d) => ({ ...d }));
}
function buildKnowledgePanelModel(input) {
  return deepFreezePanel(buildPanelModelUnfrozen(input));
}
function buildPanelModelUnfrozen(input) {
  const base = {
    snapshotState: "unavailable",
    snapshotMessage: "",
    workspace: input.workspace,
    queryObjectId: input.objectId ?? null,
    resolveState: null,
    ambiguousMatches: [],
    fields: [],
    relations: [],
    unresolvedFrom: [],
    diagnostics: [],
    provenance: null,
    lineage: null,
    diagnosticsGroups: null
  };
  if (input.load.state === "missing") {
    return {
      ...base,
      snapshotMessage: "Graph artifact missing \u2014 no snapshot is loaded. This does not mean no knowledge exists."
    };
  }
  if (input.load.state === "unavailable") {
    return {
      ...base,
      snapshotMessage: `Graph artifact unavailable (${input.load.reason}). No snapshot is loaded.`
    };
  }
  if (input.load.state === "invalid") {
    return {
      ...base,
      snapshotState: "invalid",
      snapshotMessage: `Graph artifact invalid (${input.load.reason}). No snapshot is loaded.`
    };
  }
  const graph = input.load.graph;
  if (input.objectId === void 0 || input.objectId === "") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage: `${graph.nodes.length} objects, ${graph.edges.length} declared relations in this snapshot (freshness unverified).`,
      diagnostics: emptyDiagnosticsCopy(graph.diagnostics),
      diagnosticsGroups: {
        snapshot: emptyDiagnosticsCopy(graph.diagnostics),
        unresolvedReferences: [],
        sourceResolution: null
      }
    };
  }
  const resolved = resolveObject(graph, input.workspace, input.objectId);
  if (resolved.state === "missing") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage: "Snapshot loaded.",
      resolveState: "missing",
      diagnostics: emptyDiagnosticsCopy(graph.diagnostics),
      diagnosticsGroups: {
        snapshot: emptyDiagnosticsCopy(graph.diagnostics),
        unresolvedReferences: [],
        sourceResolution: describeSourceState(input.sourceDetail)
      }
    };
  }
  if (resolved.state === "ambiguous") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage: "Snapshot loaded. Identity is ambiguous \u2014 no silent selection.",
      resolveState: "ambiguous",
      ambiguousMatches: resolved.matches.map((n) => n.object_id),
      diagnostics: emptyDiagnosticsCopy(graph.diagnostics),
      diagnosticsGroups: {
        snapshot: emptyDiagnosticsCopy(graph.diagnostics),
        unresolvedReferences: [],
        sourceResolution: describeSourceState(input.sourceDetail)
      }
    };
  }
  const node2 = resolved.node;
  const rel = relationSummary(graph, node2.object_id);
  const source = input.sourceDetail;
  const originField = source !== void 0 && source.state === "available" ? {
    label: "origin (workspace_context / created_from / creator_role)",
    text: `current source read: ${source.frontmatter.workspace_context ?? "workspace_context not declared"}; created_from: ${source.frontmatter.created_from?.join(", ") ?? "not declared"}; creator_role: ${source.frontmatter.creator_role ?? "not declared"}`,
    state: "available"
  } : {
    label: "origin (workspace_context / created_from / creator_role)",
    text: NOT_IN_SNAPSHOT,
    state: "not_loaded"
  };
  const provenanceSummaryField = source !== void 0 && source.state === "available" ? {
    label: "provenance (observation / evidence / inference / conclusion)",
    text: "declared in source (see Provenance section)",
    state: "available"
  } : {
    label: "provenance (observation / evidence / inference / conclusion)",
    text: NOT_IN_SNAPSHOT,
    state: "not_loaded"
  };
  return {
    snapshotState: "available",
    snapshotMessage: "Snapshot loaded.",
    workspace: input.workspace,
    queryObjectId: node2.object_id,
    resolveState: "available",
    ambiguousMatches: [],
    fields: [
      { label: "object_id", text: node2.object_id, state: "available" },
      { label: "title", text: node2.title, state: "available" },
      { label: "kind", text: `${node2.kind} (declared classification)`, state: "available" },
      {
        label: "status",
        text: `${node2.status} (declared lifecycle; not a validity badge)`,
        state: "available"
      },
      { label: "predecessor", text: node2.predecessor ?? "none declared", state: "available" },
      { label: "successor", text: node2.successor ?? "none declared", state: "available" },
      originField,
      provenanceSummaryField,
      {
        label: "validation",
        text: "schema/lifecycle validation not established by projection",
        state: "not_loaded"
      }
    ],
    relations: rel.rows,
    unresolvedFrom: rel.unresolvedFrom.map((e) => ({ relation: e.relation, target: e.target })),
    diagnostics: emptyDiagnosticsCopy(diagnosticsFor(graph, node2.object_id)),
    provenance: buildProvenanceSection(node2.kind, node2.status, source),
    lineage: buildLineage(graph, node2.object_id),
    diagnosticsGroups: {
      snapshot: emptyDiagnosticsCopy(graph.diagnostics),
      unresolvedReferences: rel.unresolvedFrom.map((e) => ({ relation: e.relation, target: e.target })),
      sourceResolution: describeSourceState(source)
    }
  };
}
function describeSourceState(source) {
  if (source === void 0) return null;
  if (source.state === "available") return `source resolved: ${source.path} (current-source read)`;
  if (source.state === "missing") return "source note not found for this object_id (exact match only)";
  if (source.state === "ambiguous") {
    return `source identity ambiguous (${source.paths.length} declaring notes); no silent selection`;
  }
  return `source read unavailable: ${source.reason}`;
}
function buildProvenanceSection(snapshotKind, snapshotStatus, source) {
  if (source === void 0) return null;
  if (source.state !== "available") {
    return {
      overall: source.state,
      sourceLabel: "provenance unavailable",
      layers: [
        { label: "Observation", state: "not_loaded", text: describeSourceState(source) ?? "" },
        { label: "Evidence", state: "not_loaded", text: "" },
        { label: "Inference", state: "not_loaded", text: "" },
        { label: "Conclusion", state: "not_loaded", text: "" }
      ],
      consistency: []
    };
  }
  const p = source.frontmatter.provenance;
  const layer = (label, v) => v === void 0 ? { label, state: "not declared", text: "not declared in source frontmatter" } : v === "" ? { label, state: "declared empty", text: "(declared empty)" } : { label, state: "available", text: v };
  const consistency = [];
  if (source.frontmatter.kind !== void 0 && source.frontmatter.kind !== snapshotKind) {
    consistency.push(
      `source differs from projection: kind is ${source.frontmatter.kind} in source, ${snapshotKind} in snapshot`
    );
  }
  if (source.frontmatter.status !== void 0 && source.frontmatter.status !== snapshotStatus) {
    consistency.push(
      `source differs from projection: status is ${source.frontmatter.status} in source, ${snapshotStatus} in snapshot`
    );
  }
  return {
    overall: "available",
    sourceLabel: `declared in source: ${source.path} (current-source read, freshness unverified)`,
    layers: p === void 0 ? [
      layer("Observation", void 0),
      layer("Evidence", void 0),
      layer("Inference", void 0),
      layer("Conclusion", void 0)
    ] : [
      layer("Observation", p.observation),
      layer("Evidence", p.evidence),
      layer("Inference", p.inference),
      layer("Conclusion", p.conclusion)
    ],
    consistency
  };
}
function section(parent, cls, title, open) {
  const details = createChild(parent, "details", { cls });
  if (open) details.setAttribute("open", "open");
  createChild(details, "summary", { cls: "rdkp-section-title", text: title });
  return createChild(details, "div", { cls: "rdkp-section-body" });
}
function renderKnowledgePanel(container, model, options) {
  emptyEl(container);
  const composed = options?.composedInDossier === true;
  const root = createChild(container, "div", {
    cls: composed ? "rd-knowledge-panel rdkp-composed" : "rd-knowledge-panel"
  });
  if (!composed) {
    const head = createChild(root, "div", { cls: "rdkp-head" });
    createChild(head, "span", { cls: "rdkp-scope", text: `workspace: ${model.workspace}` });
    createChild(head, "span", {
      cls: "rdkp-snapshot-state",
      text: `snapshot: ${model.snapshotState}`
    });
    createChild(root, "div", { cls: "rdkp-message", text: model.snapshotMessage });
    if (model.queryObjectId !== null) {
      createChild(root, "div", { cls: "rdkp-query", text: `query: ${model.queryObjectId}` });
    }
  }
  if (model.resolveState === "missing") {
    createChild(root, "div", {
      cls: "rdkp-resolve-state",
      text: "object: NOT_FOUND (exact object_id match only)"
    });
  } else if (model.resolveState === "ambiguous") {
    createChild(root, "div", {
      cls: "rdkp-resolve-state",
      text: `object: AMBIGUOUS (${model.ambiguousMatches.length} matches: ${model.ambiguousMatches.join(", ")}) \u2014 no silent selection`
    });
  }
  if (model.provenance !== null) {
    const prov = section(root, "rdkp-provenance", "Provenance (declared, four layers)", true);
    createChild(prov, "div", { cls: "rdkp-source-label", text: model.provenance.sourceLabel });
    let layerIndex = 0;
    for (const l of model.provenance.layers) {
      layerIndex += 1;
      const line = createChild(prov, "div", { cls: "rdkp-layer" });
      line.setAttribute("data-state", l.state);
      line.setAttribute("data-layer", l.label.toLowerCase());
      const head = createChild(line, "div", { cls: "rdkp-layer-head" });
      createChild(head, "span", {
        cls: "rdkp-layer-marker",
        text: String(layerIndex).padStart(2, "0")
      });
      createChild(head, "span", { cls: "rdkp-layer-label", text: l.label });
      createChild(head, "span", { cls: "rdkp-layer-state", text: l.state });
      createChild(line, "div", { cls: "rdkp-layer-text", text: l.text });
    }
    for (const c of model.provenance.consistency) {
      createChild(prov, "div", { cls: "rdkp-consistency", text: c });
    }
  }
  const rel = section(
    root,
    "rdkp-relations",
    `Relations (${model.relations.length} declared; snapshot counts only)`,
    true
  );
  if (model.relations.length === 0 && model.unresolvedFrom.length === 0) {
    createChild(rel, "div", { cls: "rdkp-empty", text: "no declared relations in this snapshot" });
  } else {
    const groups = /* @__PURE__ */ new Map();
    for (const row of model.relations) {
      const list2 = groups.get(row.edge.relation) ?? [];
      list2.push(row);
      groups.set(row.edge.relation, list2);
    }
    for (const relationType of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
      const groupEl = createChild(rel, "div", { cls: "rdkp-rel-group" });
      groupEl.setAttribute("data-relation", relationType);
      createChild(groupEl, "div", { cls: "rdkp-rel-type-label", text: relationType });
      for (const row of groups.get(relationType) ?? []) {
        const navigate = options?.onSelectObject;
        const line = navigate === void 0 ? createChild(groupEl, "div", { cls: "rdkp-relation-row" }) : createChild(groupEl, "button", { cls: "rdkp-relation-row rdkp-nav" });
        line.setAttribute("data-direction", row.direction);
        line.setAttribute("data-endpoint", row.endpointState);
        line.setAttribute("data-relation", row.edge.relation);
        if (navigate !== void 0) {
          line.setAttribute("aria-label", `inspect ${row.otherId}`);
          line.addEventListener("click", () => navigate(row.otherId));
        }
        createChild(line, "span", { cls: "rdkp-rel-type", text: row.edge.relation });
        createChild(line, "span", { cls: "rdkp-rel-dir", text: `[${row.direction}]` });
        createChild(line, "span", {
          cls: "rdkp-rel-path",
          text: `source: ${row.edge.source} \u2192 target: ${row.edge.target}`
        });
        createChild(line, "span", {
          cls: "rdkp-rel-endpoint",
          text: `[endpoint: ${row.endpointState}]`
        });
      }
    }
    if (model.unresolvedFrom.length > 0) {
      const unresolvedGroup = createChild(rel, "div", { cls: "rdkp-rel-group rdkp-rel-unresolved" });
      createChild(unresolvedGroup, "div", {
        cls: "rdkp-rel-type-label",
        text: "unresolved declarations"
      });
      for (const u of model.unresolvedFrom) {
        const navigate = options?.onSelectObject;
        const line = navigate === void 0 ? createChild(unresolvedGroup, "div", { cls: "rdkp-unresolved" }) : createChild(unresolvedGroup, "button", { cls: "rdkp-unresolved rdkp-nav" });
        if (navigate !== void 0) {
          line.setAttribute("aria-label", `inspect ${u.target}`);
          line.addEventListener("click", () => navigate(u.target));
        }
        line.textContent = `unresolved declaration: ${u.relation} \u2192 ${u.target} (target not in snapshot)`;
      }
    }
  }
  if (model.lineage !== null) {
    const lin = section(root, "rdkp-lineage", "Lineage (declared evolution)", false);
    const renderSide = (title, entries) => {
      createChild(lin, "div", { cls: "rdkp-lineage-title", text: title });
      if (entries.length === 0) {
        createChild(lin, "div", { cls: "rdkp-empty", text: "none declared" });
        return;
      }
      for (const e of entries) {
        const navigate = options?.onSelectObject;
        const line = navigate === void 0 ? createChild(lin, "div", { cls: "rdkp-lineage-row" }) : createChild(lin, "button", { cls: "rdkp-lineage-row rdkp-nav" });
        line.setAttribute("data-in-snapshot", String(e.inSnapshot));
        if (navigate !== void 0) {
          line.setAttribute("aria-label", `inspect ${e.objectId}`);
          line.addEventListener("click", () => navigate(e.objectId));
        }
        line.textContent = `${e.objectId}${e.status !== null ? ` [${e.status}]` : ""} \u2014 via ${e.via}${e.inSnapshot ? "" : " (not in snapshot)"}`;
      }
    };
    renderSide("Previous", model.lineage.previous);
    renderSide("Current", [{
      objectId: model.queryObjectId ?? "",
      via: "query",
      inSnapshot: true,
      status: null
    }]);
    renderSide("Following", model.lineage.following);
    for (const n of model.lineage.notes) {
      createChild(lin, "div", { cls: "rdkp-lineage-note", text: `note: ${n}` });
    }
  }
  if (model.fields.length > 0) {
    const record = section(root, "rdkp-record", "Declared record (exact declared values)", false);
    const list2 = createChild(record, "dl", { cls: "rdkp-fields" });
    for (const f of model.fields) {
      createChild(list2, "dt", { text: f.label });
      const dd = createChild(list2, "dd", { text: f.text });
      dd.setAttribute("data-state", f.state);
    }
  }
  if (model.diagnosticsGroups !== null) {
    const diag = section(root, "rdkp-diagnostics", "Diagnostics (observations, not repair requests)", false);
    const g = model.diagnosticsGroups;
    createChild(diag, "div", {
      cls: "rdkp-diag-group",
      text: `snapshot diagnostics (${g.snapshot.length})`
    });
    for (const d of g.snapshot) {
      const line = createChild(diag, "div", { cls: "rdkp-diagnostic" });
      line.setAttribute("data-type", d.type);
      line.textContent = `${d.type}: ${d.object_id} \u2014 ${d.paths.length} declaring path(s)`;
    }
    if (g.snapshot.length === 0) {
      createChild(diag, "div", { cls: "rdkp-empty", text: "none" });
    }
    if (g.unresolvedReferences.length > 0) {
      createChild(diag, "div", {
        cls: "rdkp-diag-group",
        text: `unresolved references for this object (${g.unresolvedReferences.length})`
      });
      for (const u of g.unresolvedReferences) {
        createChild(diag, "div", {
          cls: "rdkp-diagnostic",
          text: `unresolved: ${u.relation} \u2192 ${u.target}`
        });
      }
    }
    if (g.sourceResolution !== null) {
      createChild(diag, "div", { cls: "rdkp-diag-group", text: "source resolution" });
      createChild(diag, "div", { cls: "rdkp-diagnostic", text: g.sourceResolution });
    }
  }
}

// src/architecture/theme-tokens.ts
var RD_TOKEN_VERSION = "rd-tokens/1";
var RD_THEME_ATTR = "data-rd-theme";
var RD_TOKEN_CATEGORIES = [
  "identity",
  "provenance",
  "relation",
  "conflict",
  "availability",
  "lifecycle-display",
  "surface"
];
var RD_TOKENS = Object.freeze({
  identity: Object.freeze([
    "--rd-identity-title-text",
    "--rd-identity-meta-text",
    "--rd-identity-id-text",
    "--rd-identity-rule"
  ]),
  provenance: Object.freeze([
    "--rd-provenance-observation-text",
    "--rd-provenance-evidence-text",
    "--rd-provenance-inference-text",
    "--rd-provenance-conclusion-text",
    "--rd-provenance-layer-rule"
  ]),
  relation: Object.freeze([
    "--rd-relation-type-text",
    "--rd-relation-endpoint-text",
    "--rd-relation-unresolved-text",
    "--rd-relation-rule"
  ]),
  conflict: Object.freeze([
    "--rd-conflict-marker-text",
    "--rd-conflict-marker-rule"
  ]),
  availability: Object.freeze([
    "--rd-availability-available-text",
    "--rd-availability-missing-text",
    "--rd-availability-ambiguous-text",
    "--rd-availability-unavailable-text"
  ]),
  "lifecycle-display": Object.freeze([
    "--rd-lifecycle-candidate-text",
    "--rd-lifecycle-active-text",
    "--rd-lifecycle-superseded-text",
    "--rd-lifecycle-archived-text"
  ]),
  surface: Object.freeze([
    "--rd-surface-base",
    "--rd-surface-raised",
    "--rd-surface-rule",
    "--rd-surface-focus-rule"
  ])
});

// src/themes/theme-runtime.ts
var CANONICAL_TOKEN_NAMES = Object.freeze(
  RD_TOKEN_CATEGORIES.flatMap((c) => RD_TOKENS[c])
);
var HEX_RE = /^#[0-9a-fA-F]{6}$/;
var FORBIDDEN_MEANING = [
  "truth",
  "confiden",
  "rank",
  "score",
  "winner",
  "correct",
  "authority",
  "glow"
];
function validateThemeDefinition(theme) {
  const problems = [];
  if (!/^[a-z][a-z0-9-]*$/.test(theme.id)) {
    problems.push(`invalid theme id: ${theme.id}`);
  }
  if (FORBIDDEN_MEANING.some((w) => theme.id.includes(w))) {
    problems.push(`theme id encodes forbidden meaning: ${theme.id}`);
  }
  const names = Object.keys(theme.tokens);
  const missing = CANONICAL_TOKEN_NAMES.filter((t) => !(t in theme.tokens));
  const extra = names.filter((t) => !CANONICAL_TOKEN_NAMES.includes(t));
  for (const t of missing) problems.push(`missing token: ${t}`);
  for (const t of extra) problems.push(`non-canonical token: ${t}`);
  for (const [name, value] of Object.entries(theme.tokens)) {
    if (FORBIDDEN_MEANING.some((w) => name.includes(w))) {
      problems.push(`token name encodes forbidden meaning: ${name}`);
    }
    if (!HEX_RE.test(value)) {
      problems.push(`token ${name} has a non-hex value: ${value}`);
    }
  }
  return problems.length === 0 ? { valid: true } : { valid: false, problems };
}
var RDThemeRegistry = class {
  constructor() {
    this.themes = /* @__PURE__ */ new Map();
  }
  register(theme) {
    const check = validateThemeDefinition(theme);
    if (!check.valid) {
      throw new Error(`invalid theme "${theme.id}": ${check.problems.join("; ")}`);
    }
    if (this.themes.has(theme.id)) {
      throw new Error(`duplicate theme id: ${theme.id}`);
    }
    this.themes.set(theme.id, theme);
  }
  get(id) {
    return this.themes.get(id);
  }
  list() {
    return [...this.themes.values()];
  }
};
function applyRDTheme(root, theme) {
  root.setAttribute(RD_THEME_ATTR, theme.id);
  let applied = 0;
  for (const [token, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(token, value);
    applied += 1;
  }
  return applied;
}
var RDThemeController = class {
  constructor(registry, defaultThemeId) {
    this.registry = registry;
    const def = registry.get(defaultThemeId);
    if (def === void 0) {
      throw new Error(`unknown default theme: ${defaultThemeId}`);
    }
    this.current = def;
  }
  getCurrent() {
    return this.current;
  }
  /** Explicit user selection only. Unknown ids are refused. */
  setTheme(id) {
    const def = this.registry.get(id);
    if (def === void 0) {
      throw new Error(`unknown theme: ${id}`);
    }
    this.current = def;
    return def;
  }
  list() {
    return this.registry.list();
  }
};

// src/collaboration/proposal-decision.ts
var STATUS_HEADER = /^##\s+Status\s*$/m;
var HISTORY_HEADER = /^##\s+History\s*$/m;
function isProposalArtifactPath(path) {
  return /^\.proposals\/(?!\.\.(?:\/|$))[^\/]+\.md$/.test(path);
}
function isDecidableProposalText(text3) {
  const m = STATUS_HEADER.exec(text3);
  if (m === null) return false;
  const rest = text3.slice(m.index + m[0].length);
  const next = /^##\s+/m.exec(rest);
  const body = (next === null ? rest : rest.slice(0, next.index)).trim();
  return body === "pending";
}
function sectionBounds(text3, header) {
  const m = header.exec(text3);
  if (m === null) return null;
  const start = m.index + m[0].length;
  const after = text3.slice(start);
  const next = /^##\s+/m.exec(after);
  const end = next === null ? text3.length : start + next.index;
  return { start, end };
}
function applyDecisionToProposalText(text3, decision, timestamp2) {
  const status = sectionBounds(text3, STATUS_HEADER);
  if (status === null) {
    return { ok: false, reason: "no Status section" };
  }
  if (!isDecidableProposalText(text3)) {
    return { ok: false, reason: "proposal is not pending (decisions are recorded once)" };
  }
  const newStatusBody = `

${decision}

> Human decision recorded ${timestamp2} \u2014 a recorded human action.
> Approval is not truth validation and not agent trust. Execution, if any,
> happens outside RD, limited to the approved scope.

`;
  let updated = text3.slice(0, status.start) + newStatusBody + text3.slice(status.end);
  const historyLine = `- ${timestamp2} \u2014 Human decision: ${decision} (recorded via RD collaboration surface; not truth validation)`;
  const history = sectionBounds(updated, HISTORY_HEADER);
  if (history === null) {
    const trimmedEnd = updated.replace(/\s*$/, "");
    updated = `${trimmedEnd}

## History

${historyLine}
`;
  } else {
    const historyBody = updated.slice(history.start, history.end).replace(/\s*$/, "");
    updated = updated.slice(0, history.start) + `
${historyBody}
${historyLine}
` + updated.slice(history.end);
  }
  return { ok: true, text: updated };
}

// src/collaboration/artifact-reader.ts
var PROPOSALS_DIR = ".proposals";
var CONTRIBUTIONS_DIR = ".contributions";
var ORGANIZATION_PROPOSALS_DIR = ".organization-proposals";
function section2(text3, title) {
  const re = new RegExp(`^##\\s+${title}\\s*$`, "m");
  const m = re.exec(text3);
  if (m === null) return "";
  const start = m.index + m[0].length;
  const rest = text3.slice(start);
  const next = /^##\s+/m.exec(rest);
  const body = (next === null ? rest : rest.slice(0, next.index)).trim();
  return body;
}
function metaField(metadataBody, key) {
  const m = new RegExp(`^-\\s*${key}\\s*:\\s*(.+)$`, "m").exec(metadataBody);
  if (m === null) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
  return v === "" ? null : v;
}
function firstLine(body) {
  const line = body.split("\n").map((l) => l.trim()).find((l) => l !== "" && !l.startsWith("<!--"));
  return line ?? "";
}
function deepFreeze3(value) {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) deepFreeze3(v);
    Object.freeze(value);
  }
  return value;
}
var ID_KEYS = Object.freeze({
  proposal: "proposal_id",
  contribution: "contribution_id",
  "organization-proposal": "organization_proposal_id"
});
function parseArtifact(kind, file) {
  const problems = [];
  const metadataBody = section2(file.text, "Metadata");
  const id = metaField(metadataBody, ID_KEYS[kind]);
  if (id === null) problems.push(`no ${ID_KEYS[kind]} declared`);
  const authorAgent = metaField(metadataBody, "author_agent");
  if (authorAgent === null) problems.push("no author_agent declared");
  const titles = SECTION_TITLES[kind];
  const sections = {};
  for (const logical of titles) {
    const body = section2(file.text, logical);
    if (body === "") problems.push(`missing section: ${logical}`);
    sections[logical] = body;
  }
  const status = kind === "proposal" ? metaField(section2(file.text, "Status"), "status") ?? firstLine(section2(file.text, "Status")) : null;
  const humanDecision = firstLine(section2(file.text, "Human Decision")) || null;
  return deepFreeze3({
    kind,
    path: file.path,
    rawText: file.text,
    metadata: deepFreeze3({
      id,
      authorAgent,
      createdAt: metaField(metadataBody, "created_at"),
      relatedProposalId: metaField(metadataBody, "related_proposal_id"),
      relatedProposalDecision: metaField(metadataBody, "related_proposal_decision"),
      performedOperation: metaField(metadataBody, "performed_operation"),
      affectedObjects: metaField(metadataBody, "affected_objects"),
      targetObjectId: metaField(metadataBody, "target_object_id"),
      targetType: metaField(metadataBody, "target_object_type"),
      targetScope: metaField(metadataBody, "target_scope"),
      status,
      humanDecision
    }),
    sections: deepFreeze3(sections),
    malformed: problems.length > 0,
    problems: deepFreeze3(problems)
  });
}
var SECTION_TITLES = Object.freeze({
  proposal: Object.freeze([
    "Metadata",
    "Requested Change",
    "Evidence",
    "Reasoning",
    "Expected Impact",
    "Status",
    "History"
  ]),
  contribution: Object.freeze([
    "Metadata",
    "Contribution Summary",
    "Evidence Used",
    "Change Description",
    "Human Decision",
    "History"
  ]),
  "organization-proposal": Object.freeze([
    "Metadata",
    "Observed Structure",
    "Proposed Organization Change",
    "Evidence",
    "Reasoning",
    "Expected Impact",
    "Human Decision",
    "History"
  ])
});
function summaryOf(kind, detail) {
  if (kind === "proposal") return firstLine(detail.sections["Requested Change"] ?? "");
  if (kind === "contribution") return firstLine(detail.sections["Contribution Summary"] ?? "");
  return firstLine(detail.sections["Proposed Organization Change"] ?? "");
}
function rowOf(kind, detail) {
  return deepFreeze3({
    kind,
    id: detail.metadata.id,
    path: detail.path,
    authorAgent: detail.metadata.authorAgent,
    createdAt: detail.metadata.createdAt,
    summary: summaryOf(kind, detail),
    status: detail.metadata.status,
    target: kind === "organization-proposal" ? detail.metadata.targetScope : detail.metadata.targetObjectId,
    humanDecision: detail.metadata.humanDecision,
    relatedProposalId: detail.metadata.relatedProposalId,
    relatedProposalDecision: detail.metadata.relatedProposalDecision,
    performedOperation: detail.metadata.performedOperation,
    affectedObjects: detail.metadata.affectedObjects,
    malformed: detail.malformed
  });
}
function rowsFor(kind, result) {
  if (result.state !== "available") return { rows: [], state: result.state };
  const rows = result.files.map((f) => parseArtifact(kind, f)).map((d) => rowOf(kind, d)).sort((a, b) => (a.id ?? a.path).localeCompare(b.id ?? b.path));
  return { rows, state: "available" };
}
async function buildCollaborationModel(source) {
  const [proposals, contributions, orgProps] = await Promise.all([
    source.readDir(PROPOSALS_DIR),
    source.readDir(CONTRIBUTIONS_DIR),
    source.readDir(ORGANIZATION_PROPOSALS_DIR)
  ]);
  const p = rowsFor("proposal", proposals);
  const c = rowsFor("contribution", contributions);
  const o = rowsFor("organization-proposal", orgProps);
  return deepFreeze3({
    proposals: p.rows,
    contributions: c.rows,
    organizationProposals: o.rows,
    dirs: deepFreeze3({
      proposal: p.state,
      contribution: c.state,
      "organization-proposal": o.state
    })
  });
}
async function loadArtifactDetail(source, kind, path) {
  const dir = kind === "proposal" ? PROPOSALS_DIR : kind === "contribution" ? CONTRIBUTIONS_DIR : ORGANIZATION_PROPOSALS_DIR;
  const result = await source.readDir(dir);
  if (result.state !== "available") return null;
  const file = result.files.find((f) => f.path === path);
  if (file === void 0) return null;
  return parseArtifact(kind, file);
}

// src/collaboration/collaboration-surface.ts
function deepFreeze4(value) {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value)) deepFreeze4(v);
    Object.freeze(value);
  }
  return value;
}
var CollaborationBrowser = class {
  constructor() {
    this.state = deepFreeze4({
      model: null,
      selectedArtifact: null,
      trail: []
    });
    this.listeners = /* @__PURE__ */ new Set();
  }
  getState() {
    return this.state;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Explicit re-read of available artifacts (user action only). */
  async refresh(source) {
    const model = await buildCollaborationModel(source);
    this.update({ model, selectedArtifact: null, trail: [] });
  }
  /** List → detail navigation (explicit kind + exact path). */
  select(kind, path) {
    const selection = { kind, path };
    this.update({
      selectedArtifact: selection,
      trail: [...this.state.trail, selection]
    });
  }
  /** Detail → back along the browsing trail. */
  back() {
    const trail = this.state.trail.slice(0, -1);
    this.update({
      trail,
      selectedArtifact: trail.length > 0 ? trail[trail.length - 1] : null
    });
  }
  dispose() {
    this.listeners.clear();
  }
  update(patch) {
    this.state = deepFreeze4({ ...this.state, ...patch });
    for (const listener of [...this.listeners]) listener(this.state);
  }
};
var EMPTY_TEXTS = Object.freeze({
  contribution: "No contribution records found.",
  proposal: "No proposal records found.",
  "organization-proposal": "No organization proposal records found."
});
var EMPTY_EXPLAINER = "Artifact records appear here when agents create contribution or proposal records.";
function renderIntro(parent) {
  const intro = createChild(parent, "div", { cls: "rdcol-intro" });
  createChild(intro, "div", {
    cls: "rdcol-intro-line",
    text: "Collaboration displays contributions and proposals created by external agents."
  });
  createChild(intro, "div", {
    cls: "rdcol-intro-line",
    text: "These records describe proposed work. They do not validate knowledge, approve changes, or modify the vault automatically."
  });
  createChild(intro, "div", {
    cls: "rdcol-intro-principles",
    text: "proposal \u2260 approval \xB7 contribution \u2260 truth \xB7 visibility \u2260 validation"
  });
  createChild(intro, "div", {
    cls: "rdcol-intro-status",
    text: "Statuses (pending / approved / rejected / applied) record human actions \u2014 they are not system truth states: approved does not mean correct; applied does not mean verified."
  });
}
function renderRow(list2, row, onSelect) {
  const item = createChild(list2, "button", { cls: "rdcol-row" });
  item.setAttribute("aria-label", `inspect ${row.id ?? row.path}`);
  item.addEventListener("click", () => onSelect(row.kind, row.path));
  const head = createChild(item, "div", { cls: "rdcol-row-head" });
  head.textContent = `${row.id ?? "(no id declared)"} \xB7 ${row.authorAgent ?? "author not declared"}${row.createdAt !== null ? ` \xB7 ${row.createdAt}` : ""}`;
  const summary = createChild(item, "div", { cls: "rdcol-row-summary" });
  summary.textContent = row.summary !== "" ? row.summary : "(no summary section)";
  const tail = createChild(item, "div", { cls: "rdcol-row-tail" });
  const parts = [];
  if (row.target !== null) parts.push(`target: ${row.target}`);
  if (row.status !== null) parts.push(`status: ${row.status} (recorded human action)`);
  if (row.relatedProposalId !== null) parts.push(`proposal: ${row.relatedProposalId}`);
  if (row.humanDecision !== null) parts.push(`decision: ${row.humanDecision}`);
  if (row.malformed) parts.push("\u26A0 flagged: malformed");
  tail.textContent = parts.join(" \xB7 ");
}
function renderSection(parent, title, rows, dirState, emptyText, onSelect) {
  const details = createChild(parent, "details", { cls: "rdcol-section" });
  details.setAttribute("open", "open");
  createChild(details, "summary", { cls: "rdcol-section-title", text: `${title} (${rows.length})` });
  const body = createChild(details, "div", { cls: "rdcol-section-body" });
  if (dirState !== "available") {
    createChild(body, "div", { cls: "rdcol-empty", text: emptyText });
    createChild(body, "div", { cls: "rdcol-empty-explain", text: EMPTY_EXPLAINER });
    createChild(body, "div", {
      cls: "rdcol-dir-state",
      text: `artifact directory state: ${dirState}`
    });
    return;
  }
  if (rows.length === 0) {
    createChild(body, "div", { cls: "rdcol-empty", text: emptyText });
    createChild(body, "div", { cls: "rdcol-empty-explain", text: EMPTY_EXPLAINER });
    return;
  }
  for (const row of rows) renderRow(body, row, onSelect);
}
function renderDetail(parent, detail, handlers, linkingContributions) {
  const box = createChild(parent, "div", { cls: "rdcol-detail" });
  const head = createChild(box, "div", { cls: "rdcol-detail-head" });
  head.textContent = `${detail.metadata.id ?? "(no id declared)"} \xB7 ${detail.metadata.authorAgent ?? "author not declared"} \xB7 source: ${detail.path} (read-only inspection)`;
  if (detail.kind === "contribution" && detail.metadata.relatedProposalId !== null) {
    const link = createChild(box, "div", { cls: "rdcol-linkage" });
    link.textContent = `workflow: proposal ${detail.metadata.relatedProposalId} \u2192 decision ${detail.metadata.relatedProposalDecision ?? "not declared"} \u2192 this record`;
  }
  if (detail.kind === "proposal") {
    const link = createChild(box, "div", { cls: "rdcol-linkage" });
    link.textContent = linkingContributions.length > 0 ? `workflow: this proposal \u2192 Human decision \u2192 ${linkingContributions.length} contribution record(s) below` : "workflow: this proposal \u2192 Human decision \u2192 (no contribution records reference it yet)";
  }
  const meta = createChild(box, "dl", { cls: "rdcol-meta" });
  const metaRows = [
    ["created_at", detail.metadata.createdAt],
    ["target", detail.kind === "organization-proposal" ? detail.metadata.targetScope : detail.metadata.targetObjectId],
    ["target type", detail.metadata.targetType],
    ["related proposal", detail.metadata.relatedProposalId],
    ["proposal decision", detail.metadata.relatedProposalDecision],
    ["performed operation", detail.metadata.performedOperation],
    ["affected objects", detail.metadata.affectedObjects],
    ["status", detail.metadata.status !== null ? `${detail.metadata.status} (recorded human action; not a truth state)` : null],
    ["human decision", detail.metadata.humanDecision]
  ];
  for (const [label, value] of metaRows) {
    createChild(meta, "dt", { text: label });
    const dd = createChild(meta, "dd", { text: value ?? "not declared" });
    dd.setAttribute("data-state", value !== null ? "available" : "not-declared");
  }
  if (detail.malformed) {
    createChild(box, "div", {
      cls: "rdcol-flag",
      text: `\u26A0 flagged (shown, not hidden): ${detail.problems.join("; ")}`
    });
  }
  if (detail.kind === "proposal" && detail.metadata.status === "pending" && isDecidableProposalText(detail.rawText)) {
    const decide = createChild(box, "div", { cls: "rdcol-decide" });
    createChild(decide, "div", {
      cls: "rdcol-decide-note",
      text: "Record your decision on this proposal. Approved means you authorize the proposed scope for external execution \u2014 it does not mean correct, does not mean verified, and does not trust the agent."
    });
    const approve = createChild(decide, "button", {
      cls: "rdcol-decide-button",
      text: "Approve (record decision)"
    });
    approve.setAttribute("aria-label", "Record approval of this proposal");
    approve.addEventListener("click", () => handlers.onDecide("approved", detail.path));
    const reject = createChild(decide, "button", {
      cls: "rdcol-decide-button",
      text: "Reject (record decision)"
    });
    reject.setAttribute("aria-label", "Record rejection of this proposal");
    reject.addEventListener("click", () => handlers.onDecide("rejected", detail.path));
  }
  const ORDERS = Object.freeze({
    proposal: Object.freeze([
      ["Requested Change", "Requested / Proposed Change"],
      ["Evidence", "Evidence"],
      ["Reasoning", "Reasoning"],
      ["Expected Impact", "Expected Impact"],
      ["Status", "Status (recorded human action)"],
      ["History", "History (append-only)"]
    ]),
    contribution: Object.freeze([
      ["Contribution Summary", "Contribution Summary"],
      ["Change Description", "Change Description"],
      ["Evidence Used", "Evidence Used"],
      ["Human Decision", "Human Decision (recorded human action)"],
      ["History", "History (append-only)"]
    ]),
    "organization-proposal": Object.freeze([
      ["Observed Structure", "Observed Structure"],
      ["Proposed Organization Change", "Proposed Organization Change"],
      ["Evidence", "Evidence"],
      ["Reasoning", "Reasoning"],
      ["Expected Impact", "Expected Impact"],
      ["Human Decision", "Human Decision (recorded human action)"],
      ["History", "History (append-only)"]
    ])
  });
  for (const [key, label] of ORDERS[detail.kind]) {
    const body = detail.sections[key];
    if (body === void 0) continue;
    const sec = createChild(box, "details", { cls: "rdcol-detail-section" });
    createChild(sec, "summary", { cls: "rdcol-section-title", text: label });
    createChild(sec, "div", { cls: "rdcol-detail-body", text: body === "" ? "(not declared)" : body });
  }
  if (detail.kind === "proposal" && linkingContributions.length > 0) {
    const refs = createChild(box, "details", { cls: "rdcol-detail-section" });
    createChild(refs, "summary", {
      cls: "rdcol-section-title",
      text: `Referenced by contribution records (${linkingContributions.length})`
    });
    for (const c of linkingContributions) {
      const line = createChild(refs, "div", { cls: "rdcol-linkage-row" });
      line.textContent = `${c.id ?? c.path} \xB7 decision: ${c.relatedProposalDecision ?? "not declared"}` + (c.performedOperation !== null ? ` \xB7 ${c.performedOperation}` : "") + (c.affectedObjects !== null ? ` \xB7 affected: ${c.affectedObjects}` : "");
    }
  }
  createChild(box, "div", {
    cls: "rdcol-note",
    text: "This view displays what was proposed. Decisions are Human acts recorded in artifacts: Approve/Reject record your decision on a pending proposal. No apply or execute action exists in RD \u2014 approved work is performed outside RD, limited to the approved scope, and reported back via a Contribution Record."
  });
}
function renderCollaboration(container, state, detail, handlers) {
  emptyEl(container);
  const root = createChild(container, "div", { cls: "rd-collaboration" });
  if (state.selectedArtifact !== null && detail !== null) {
    const bar = createChild(root, "div", { cls: "rdcol-nav" });
    const back = createChild(bar, "button", { cls: "rdcol-back", text: "\u25C0 Back" });
    back.setAttribute("aria-label", "Back to collaboration list");
    back.addEventListener("click", handlers.onBack);
    const linking = state.model !== null && detail.kind === "proposal" && detail.metadata.id !== null ? state.model.contributions.filter(
      (c) => c.relatedProposalId === detail.metadata?.id
    ) : [];
    renderDetail(root, detail, {
      onDecide: handlers.onDecide
    }, linking);
    return;
  }
  if (state.model === null) {
    createChild(root, "div", { cls: "rdcol-empty", text: "loading artifact directories\u2026" });
    return;
  }
  renderIntro(root);
  renderSection(
    root,
    "Agent Contributions",
    state.model.contributions,
    state.model.dirs.contribution,
    EMPTY_TEXTS.contribution,
    handlers.onSelect
  );
  renderSection(
    root,
    "Proposals",
    state.model.proposals,
    state.model.dirs.proposal,
    EMPTY_TEXTS.proposal,
    handlers.onSelect
  );
  renderSection(
    root,
    "Organization Proposals",
    state.model.organizationProposals,
    state.model.dirs["organization-proposal"],
    EMPTY_TEXTS["organization-proposal"],
    handlers.onSelect
  );
}
async function resolveDetail(source, state) {
  const selection = state.selectedArtifact;
  if (selection === null || state.model === null) return null;
  return loadArtifactDetail(source, selection.kind, selection.path);
}

// src/views/knowledge-panel-view.ts
var import_obsidian2 = require("obsidian");
var RD_KNOWLEDGE_PANEL_VIEW_TYPE = "rd-knowledge-panel";
var RDKnowledgePanelView = class extends import_obsidian2.ItemView {
  constructor(leaf, deps) {
    super(leaf);
    // Named graphLoad: View.load() is an Obsidian lifecycle method.
    this.graphLoad = { state: "unavailable", reason: "not loaded yet" };
    this.sourceDetail = void 0;
    this.query = "";
    this.deps = deps;
  }
  getViewType() {
    return RD_KNOWLEDGE_PANEL_VIEW_TYPE;
  }
  getDisplayText() {
    return "RD Knowledge Panel";
  }
  getIcon() {
    return "book-open";
  }
  async onOpen() {
    emptyEl(this.contentEl);
    const shell = createChild(this.contentEl, "div", { cls: "rd-knowledge-panel-shell" });
    const bar = createChild(shell, "div", { cls: "rdkp-toolbar" });
    const input = createChild(bar, "input", { cls: "rdkp-input" });
    input.type = "text";
    input.placeholder = "exact object_id (e.g. ko-20260919-0001)";
    input.setAttribute("aria-label", "Knowledge object id (exact match)");
    const apply = createChild(bar, "button", { cls: "rdkp-button", text: "Inspect" });
    apply.addEventListener("click", () => {
      this.query = input.value.trim();
      this.renderPanel();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.query = input.value.trim();
        this.renderPanel();
      }
    });
    const reload = createChild(bar, "button", { cls: "rdkp-button", text: "Re-read snapshot" });
    reload.addEventListener("click", () => {
      void this.refresh();
    });
    createChild(shell, "div", { cls: "rdkp-panel-host" });
    await this.refresh();
  }
  async onClose() {
    emptyEl(this.contentEl);
  }
  /** Refresh = re-read available data through the source ports.
   * No Python spawn, no file mutation, no agent invocation. */
  async refresh() {
    this.deps.sourceReader?.invalidate?.();
    this.graphLoad = await loadGraphFromSource(this.deps.source);
    this.sourceDetail = void 0;
    if (this.deps.sourceReader !== void 0 && this.query !== "") {
      this.sourceDetail = await this.deps.sourceReader.resolve(this.query);
    }
    this.renderPanel();
  }
  renderPanel() {
    const host = this.contentEl.querySelector(".rdkp-panel-host");
    if (!(host instanceof HTMLElement)) return;
    void this.resolveSourceAndRender();
    const model = buildKnowledgePanelModel({
      load: this.graphLoad,
      workspace: this.deps.workspace,
      objectId: this.query === "" ? void 0 : this.query,
      sourceDetail: this.sourceDetail
    });
    renderKnowledgePanel(host, model);
  }
  /** Query changes trigger an exact source resolution (async),
   * then a re-render. Snapshot data renders immediately. */
  async resolveSourceAndRender() {
    if (this.deps.sourceReader === void 0 || this.query === "") return;
    const detail = await this.deps.sourceReader.resolve(this.query);
    if (detail === this.sourceDetail) return;
    this.sourceDetail = detail;
    this.renderPanel();
  }
};

// src/views/graph-intelligence-view.ts
var import_obsidian3 = require("obsidian");

// src/graph/graph-projection.ts
function edgesFor(index2, subjectPath, typeByPath, excludeKeys, rootPath) {
  const rows = [];
  for (const relation of index2.relations) {
    if (excludeKeys.has(relation.key)) continue;
    const subjectIsSource = relation.source.path === subjectPath;
    const subjectIsTarget = relation.target.path === subjectPath;
    if (!subjectIsSource && !subjectIsTarget) continue;
    const other = subjectIsSource ? relation.target : relation.source;
    if (rootPath !== null && other.path === rootPath) continue;
    rows.push({
      key: relation.key,
      predicate: relation.predicate,
      direction: subjectIsSource ? "outgoing" : "incoming",
      otherLabel: other.objectId !== null && other.objectId.length > 0 ? other.objectId : other.raw,
      otherPath: other.path,
      otherType: other.path !== null ? typeByPath.get(other.path)?.type ?? null : null,
      resolution: other.resolution,
      provenance: provenanceOf(relation)
    });
  }
  rows.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  return rows;
}
function provenanceOf(relation) {
  return [...relation.assertions].map((a) => ({
    declaredPredicate: a.predicate,
    sourcePath: a.location.path,
    kind: a.location.kind,
    field: a.location.field ?? null,
    line: a.location.line ?? null,
    rawLink: a.link.raw,
    sourceRevision: a.location.sourceRevision,
    sortLine: a.location.line ?? a.location.range?.start ?? 0
  })).sort((x, y) => {
    if (x.sourcePath !== y.sourcePath) return x.sourcePath < y.sourcePath ? -1 : 1;
    if (x.sortLine !== y.sortLine) return x.sortLine - y.sortLine;
    if (x.declaredPredicate !== y.declaredPredicate) return x.declaredPredicate < y.declaredPredicate ? -1 : 1;
    return x.rawLink < y.rawLink ? -1 : x.rawLink > y.rawLink ? 1 : 0;
  }).map(({ declaredPredicate, sourcePath, kind, field, line, rawLink, sourceRevision }) => ({
    declaredPredicate,
    sourcePath,
    kind,
    field,
    line,
    rawLink,
    sourceRevision
  }));
}
function buildGraphProjection(index2, selectedPath) {
  const { objects } = index2.snapshot();
  const typeByPath = /* @__PURE__ */ new Map();
  for (const o of objects) typeByPath.set(o.path, o);
  const selectable = objects.filter((o) => o.type === "case" || o.type === "evidence" || o.type === "hypothesis" || o.type === "loop").sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map((o) => ({ path: o.path, id: o.id, type: o.type, title: o.title }));
  const data = {
    indexState: index2.state,
    phase: "NO_OBJECT_SELECTED",
    selectedObject: null,
    selectableObjects: selectable,
    firstHop: []
  };
  if (selectedPath === null) return data;
  const selected = typeByPath.get(selectedPath) ?? null;
  if (selected === null) {
    data.phase = "NO_SUCH_OBJECT";
    return data;
  }
  data.phase = "READY";
  data.selectedObject = {
    path: selected.path,
    id: selected.id,
    title: selected.title,
    type: selected.type,
    status: selected.status,
    lastVerified: selected.lastVerified
  };
  data.firstHop = edgesFor(index2, selected.path, typeByPath, /* @__PURE__ */ new Set(), null);
  return data;
}
function buildSecondHop(index2, neighborPath, rootPath) {
  const { objects } = index2.snapshot();
  const typeByPath = /* @__PURE__ */ new Map();
  for (const o of objects) typeByPath.set(o.path, o);
  const excludeKeys = /* @__PURE__ */ new Set();
  for (const relation of index2.relations) {
    const touchesRoot = relation.source.path === rootPath || relation.target.path === rootPath;
    const touchesNeighbor = relation.source.path === neighborPath || relation.target.path === neighborPath;
    if (touchesRoot && touchesNeighbor) excludeKeys.add(relation.key);
  }
  return edgesFor(index2, neighborPath, typeByPath, excludeKeys, rootPath);
}

// src/views/graph-intelligence-view.ts
var RD_GRAPH_VIEW_TYPE = "rd-graph-intelligence";
var RDGraphIntelligenceView = class extends import_obsidian3.ItemView {
  constructor(leaf, deps) {
    super(leaf);
    this.unsubscribeIndex = null;
    this.unsubscribeActive = null;
    this.container = null;
    /** §4: memory-only selection. */
    this.selectedPath = null;
    /** §15: memory-only expanded second-hop neighbors (resolved paths). */
    this.expandedNeighbors = /* @__PURE__ */ new Set();
    /** GI-04: native graph result is ROOT-SPECIFIC; null until known
     * for the CURRENT root, reset on every root change, and guarded by
     * a generation token so stale async results cannot leak across. */
    this.nativeGraphState = null;
    this.nativeGraphRoot = null;
    this.nativeGraphGeneration = 0;
    /** GI-02: focus restoration key after a disclosure redraw. */
    this.focusRestoreNeighbor = null;
    this.deps = deps;
  }
  getViewType() {
    return RD_GRAPH_VIEW_TYPE;
  }
  getDisplayText() {
    return "RD Graph Intelligence";
  }
  getIcon() {
    return "git-fork";
  }
  async onOpen() {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-graph" });
    this.unsubscribeIndex = this.deps.onIndexCommit(() => this.onIndexChanged());
    this.unsubscribeActive = this.deps.onActiveFile((path) => this.onActiveFileChanged(path));
    this.syncFromActiveFile(
      this.deps.activeFileProvider !== void 0 ? this.deps.activeFileProvider() : null
    );
    this.render();
  }
  async onClose() {
    this.unsubscribeIndex?.();
    this.unsubscribeActive?.();
    this.unsubscribeIndex = null;
    this.unsubscribeActive = null;
    emptyEl(this.contentEl);
  }
  selectObject(path) {
    if (path !== this.selectedPath) {
      this.expandedNeighbors.clear();
      this.resetNativeGraphState();
    }
    this.selectedPath = path;
    this.render();
  }
  get selected() {
    return this.selectedPath;
  }
  get expandedSecondHops() {
    return [...this.expandedNeighbors];
  }
  onActiveFileChanged(path) {
    if (this.syncFromActiveFile(path)) this.render();
  }
  /** §4: follow the active RD object; RETAIN the selection when the
   * active file is not an indexed RD object. */
  syncFromActiveFile(path) {
    if (path === null) return false;
    if (path === this.selectedPath) return false;
    const object = this.deps.index.objectAt(path);
    if (object === null) return false;
    this.expandedNeighbors.clear();
    this.resetNativeGraphState();
    this.selectedPath = path;
    return true;
  }
  /** GI-04: root-bound native state; stale async results are also
   * generation-guarded at completion time. */
  resetNativeGraphState() {
    this.nativeGraphState = null;
    this.nativeGraphRoot = null;
    this.nativeGraphGeneration += 1;
  }
  onIndexChanged() {
    if (this.selectedPath !== null) {
      const object = this.deps.index.objectAt(this.selectedPath);
      if (object === null) {
        this.selectedPath = null;
        this.expandedNeighbors.clear();
        this.resetNativeGraphState();
      }
    }
    for (const path of [...this.expandedNeighbors]) {
      const object = this.deps.index.objectAt(path);
      if (object === null) this.expandedNeighbors.delete(path);
    }
    this.render();
  }
  render() {
    const shell = this.container;
    if (shell === null) return;
    emptyEl(shell);
    const data = buildGraphProjection(this.deps.index, this.selectedPath);
    const restoreFocus = this.focusRestoreNeighbor;
    this.focusRestoreNeighbor = null;
    if (restoreFocus !== null) {
      window.setTimeout(() => {
        for (const toggle of this.container?.querySelectorAll(
          ".rdg-hop-toggle"
        ) ?? []) {
          if (toggle.dataset.neighborPath === restoreFocus) {
            toggle.focus();
            return;
          }
        }
      }, 0);
    }
    const head = createChild(shell, "div", { cls: "rdg-head" });
    createChild(head, "div", { cls: "rdg-title", text: "Graph Intelligence" });
    if (data.indexState === "INDEXING") {
      createChild(shell, "div", { cls: "rdg-state", text: "Indexing archive\u2026" });
      return;
    }
    if (data.indexState === "ERROR") {
      createChild(shell, "div", { cls: "rdg-state rdg-error", text: "Index unavailable." });
      return;
    }
    if (data.phase !== "READY" || data.selectedObject === null) {
      const section3 = this.section(shell, "RD Objects");
      if (data.selectableObjects.length === 0) {
        createChild(shell, "div", { cls: "rdg-state", text: "No RD object selected." });
        return;
      }
      for (const entry2 of data.selectableObjects) {
        const btn = createChild(section3, "button", { cls: "rdg-pick" });
        btn.setAttribute("aria-label", `Select ${entry2.type} ${entry2.title}`);
        const line = createChild(btn, "span", { cls: "rdg-pick-title" });
        line.textContent = `${entry2.type} \xB7 ${entry2.title}`;
        const meta = createChild(btn, "span", { cls: "rdg-meta" });
        meta.textContent = entry2.id ?? "(no id)";
        btn.addEventListener("click", () => this.selectObject(entry2.path));
      }
      return;
    }
    this.renderIdentity(shell, data.selectedObject);
    this.renderFirstHop(shell, data);
    if (this.expandedNeighbors.size > 0) {
      this.renderSecondHop(shell, data.selectedObject.path);
    }
    this.renderNativeGraph(shell, data.selectedObject.path);
  }
  /** §6: canonical identity fields only. */
  renderIdentity(shell, identity) {
    const section3 = this.section(shell, "Identity");
    const idEl = createChild(section3, "div", { cls: "rdg-identity" });
    createChild(idEl, "span", { cls: "rdg-identity-title", text: identity.title });
    const meta = createChild(idEl, "span", { cls: "rdg-meta" });
    const bits = [
      identity.id ?? "(no id)",
      identity.type,
      identity.status || "(no status)",
      identity.path
    ];
    if (identity.lastVerified !== null) bits.push("verified " + identity.lastVerified);
    meta.textContent = bits.join(" \xB7 ");
  }
  renderFirstHop(shell, data) {
    const section3 = this.section(shell, "Semantic Relations");
    if (data.firstHop.length === 0) {
      createChild(section3, "div", { cls: "rdg-state", text: "No semantic relations recorded." });
      return;
    }
    for (const edge of data.firstHop) {
      this.renderEdge(section3, edge, true);
    }
  }
  /** §12: second-hop branch, direction relative to the NEIGHBOR. */
  renderSecondHop(shell, rootPath) {
    const section3 = this.section(shell, "Second Hop");
    for (const neighbor of [...this.expandedNeighbors].sort()) {
      const rows = buildSecondHop(this.deps.index, neighbor, rootPath);
      const branch = createChild(section3, "div", { cls: "rdg-branch" });
      const branchTitle = createChild(branch, "div", { cls: "rdg-branch-title" });
      branchTitle.textContent = `Second hop via ${neighbor}`;
      if (rows.length === 0) {
        createChild(branch, "div", { cls: "rdg-state", text: "No semantic relations recorded." });
      }
      for (const edge of rows) {
        this.renderEdge(branch, edge, false);
      }
    }
  }
  renderEdge(container, edge, expandable) {
    const navigable = edge.otherPath !== null && edge.resolution === "RESOLVED";
    const row = createChild(container, "div", { cls: "rdg-rel" });
    if (!navigable) row.setAttribute("aria-disabled", "true");
    const line = createChild(row, "span", { cls: "rdg-rel-line" });
    const typeTag = edge.otherType !== null ? ` [${edge.otherType}]` : "";
    line.textContent = `${edge.direction === "outgoing" ? "\u2192" : "\u2190"} ${edge.predicate} ${edge.otherLabel}${typeTag}`;
    const badge = createChild(row, "span", { cls: "rdg-badge" });
    badge.textContent = edge.resolution;
    badge.setAttribute("data-state", edge.resolution);
    if (navigable && edge.otherPath !== null) {
      const otherPath = edge.otherPath;
      const endpoint = createChild(row, "button", { cls: "rdg-endpoint" });
      endpoint.textContent = "open";
      endpoint.setAttribute("aria-label", `Open ${edge.otherLabel}`);
      endpoint.addEventListener("click", () => {
        void this.deps.navigation.open({ path: otherPath }, "normal");
      });
      if (expandable) {
        const toggle = createChild(row, "button", { cls: "rdg-hop-toggle" });
        const expanded = this.expandedNeighbors.has(otherPath);
        toggle.textContent = expanded ? "\u2212 second hop" : "+ second hop";
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        toggle.setAttribute("aria-label", `Toggle second hop via ${edge.otherLabel}`);
        toggle.setAttribute("data-neighbor-path", otherPath);
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.expandedNeighbors.has(otherPath)) this.expandedNeighbors.delete(otherPath);
          else this.expandedNeighbors.add(otherPath);
          this.focusRestoreNeighbor = otherPath;
          this.render();
        });
      }
    }
    const prov = createChild(container, "div", { cls: "rdg-prov" });
    for (const p of edge.provenance) {
      this.renderProvenance(prov, p);
    }
  }
  renderProvenance(container, p) {
    const row = createChild(container, "div", { cls: "rdg-prov-row" });
    const line = createChild(row, "span", { cls: "rdg-prov-line" });
    const location = p.kind === "frontmatter" ? `frontmatter \xB7 ${p.field ?? p.declaredPredicate}` : `body${p.line !== null ? " \xB7 line " + p.line : ""}`;
    line.textContent = `${p.declaredPredicate} @ ${p.sourcePath} (${location}) raw [[${p.rawLink}]]`;
    const btn = createChild(row, "button", { cls: "rdg-src" });
    btn.textContent = "Open source";
    btn.setAttribute("aria-label", `Open source ${p.sourcePath}`);
    const target = p.kind === "body" && p.line !== null ? {
      path: p.sourcePath,
      line: p.line,
      sourceRevision: p.sourceRevision,
      sourceLocator: { predicate: p.declaredPredicate, raw: p.rawLink }
    } : { path: p.sourcePath };
    btn.addEventListener("click", () => {
      void this.deps.navigation.open(target, target.line !== void 0 ? "source" : "normal");
    });
  }
  /** §17 + GI-04: restrained native handoff through the ONE
   * NavigationPort. The pending result is bound to the CURRENT root
   * and a generation token; a root switch invalidates both, so a
   * stale async completion can never overwrite the new root's UI. */
  renderNativeGraph(shell, path) {
    const section3 = this.section(shell, "Native Graph");
    const btn = createChild(section3, "button", { cls: "rdg-native" });
    btn.textContent = "Open Native Local Graph";
    btn.setAttribute("aria-label", "Open Obsidian local graph for the selected object");
    btn.addEventListener("click", () => {
      const opener = this.deps.navigation.openLocalGraph;
      const generation = this.nativeGraphGeneration;
      const rootAtClick = this.selectedPath;
      if (opener === void 0) {
        if (generation !== this.nativeGraphGeneration || rootAtClick !== this.selectedPath) return;
        this.nativeGraphState = "UNAVAILABLE";
        this.nativeGraphRoot = rootAtClick;
        this.render();
        return;
      }
      void opener.call(this.deps.navigation, path).then((result) => {
        if (generation !== this.nativeGraphGeneration || rootAtClick !== this.selectedPath) {
          return;
        }
        this.nativeGraphState = result;
        this.nativeGraphRoot = rootAtClick;
        this.render();
      });
    });
    if (this.nativeGraphState === "UNAVAILABLE" && this.nativeGraphRoot === path) {
      createChild(section3, "div", { cls: "rdg-state", text: "Native Local Graph unavailable." });
    }
  }
  section(shell, title) {
    const section3 = createChild(shell, "section", { cls: "rdg-section" });
    createChild(section3, "h3", { cls: "rdg-section-title", text: title });
    return section3;
  }
};

// src/views/loop-view.ts
var import_obsidian4 = require("obsidian");

// src/loop/loop-projection.ts
var RECURRENCE_PREDICATES = /* @__PURE__ */ new Set([
  "repeats_in",
  "observed_in"
]);
function ownerSection(row) {
  if (RECURRENCE_PREDICATES.has(row.predicate)) return "recurrences";
  if (row.otherType === "evidence") return "evidence";
  if (row.otherType === "hypothesis") return "hypotheses";
  if (row.otherType === "case") return "cases";
  return "recurrences";
}
function endpointLabel(objectId, raw) {
  return objectId !== null && objectId.length > 0 ? objectId : raw;
}
function otherSide(relation, loopPath) {
  const loopIsSource = relation.source.path === loopPath;
  const loopIsTarget = relation.target.path === loopPath;
  if (!loopIsSource && !loopIsTarget) return null;
  if (loopIsSource && relation.target.path === loopPath && relation.source.path === loopPath) {
    return { other: relation.target, direction: "outgoing" };
  }
  return loopIsSource ? { other: relation.target, direction: "outgoing" } : { other: relation.source, direction: "incoming" };
}
function buildLoopProjection(index2, selectedLoopPath) {
  const { objects } = index2.snapshot();
  const loops = objects.filter((o) => o.type === "loop").sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map((o) => ({ path: o.path, id: o.id, title: o.title }));
  const data = {
    indexState: index2.state,
    phase: "NO_LOOP_SELECTED",
    selectedLoop: null,
    loops,
    recurrences: [],
    evidence: [],
    hypotheses: [],
    cases: []
  };
  if (selectedLoopPath === null) return data;
  const selected = objects.find((o) => o.path === selectedLoopPath) ?? null;
  if (selected === null || selected.type !== "loop") {
    data.phase = "NO_SUCH_LOOP";
    return data;
  }
  data.phase = "READY";
  data.selectedLoop = {
    path: selected.path,
    id: selected.id,
    title: selected.title,
    status: selected.status,
    lastVerified: selected.lastVerified
  };
  const typeByPath = /* @__PURE__ */ new Map();
  for (const o of objects) typeByPath.set(o.path, o);
  const rows = [];
  for (const relation of index2.relations) {
    const side = otherSide(relation, selected.path);
    if (side === null) continue;
    const otherPath = side.other.path;
    const partial = {
      key: relation.key,
      predicate: relation.predicate,
      direction: side.direction,
      otherLabel: endpointLabel(side.other.objectId, side.other.raw),
      otherPath,
      otherType: otherPath !== null ? typeByPath.get(otherPath)?.type ?? null : null,
      resolution: side.other.resolution
    };
    rows.push({ ...partial, section: ownerSection(partial) });
  }
  rows.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  data.recurrences = rows.filter((r) => r.section === "recurrences");
  data.evidence = rows.filter((r) => r.section === "evidence");
  data.hypotheses = rows.filter((r) => r.section === "hypotheses");
  data.cases = rows.filter((r) => r.section === "cases");
  return data;
}

// src/views/loop-view.ts
var RD_LOOP_VIEW_TYPE = "rd-loop-workspace";
var RDLoopView = class extends import_obsidian4.ItemView {
  constructor(leaf, deps) {
    super(leaf);
    this.unsubscribeIndex = null;
    this.unsubscribeActive = null;
    this.container = null;
    /** §4/§17: memory-only selected LOOP path. */
    this.selectedLoopPath = null;
    this.deps = deps;
  }
  getViewType() {
    return RD_LOOP_VIEW_TYPE;
  }
  getDisplayText() {
    return "RD Loop Workspace";
  }
  getIcon() {
    return "iteration-ccw";
  }
  async onOpen() {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-loop" });
    this.unsubscribeIndex = this.deps.onIndexCommit(() => this.onIndexChanged());
    this.unsubscribeActive = this.deps.onActiveFile((path) => this.onActiveFileChanged(path));
    this.syncFromActiveFile(this.currentActivePath());
    this.render();
  }
  async onClose() {
    this.unsubscribeIndex?.();
    this.unsubscribeActive?.();
    this.unsubscribeIndex = null;
    this.unsubscribeActive = null;
    emptyEl(this.contentEl);
  }
  /** Test/programmatic selection; memory-only. */
  selectLoop(path) {
    this.selectedLoopPath = path;
    this.render();
  }
  get selectedLoop() {
    return this.selectedLoopPath;
  }
  currentActivePath() {
    return this.deps.activeFileProvider !== void 0 ? this.deps.activeFileProvider() : null;
  }
  onActiveFileChanged(path) {
    if (this.syncFromActiveFile(path)) this.render();
  }
  /** §17: follow the active LOOP; retain the current selection when
   * the active file is not a LOOP. Returns whether state changed. */
  syncFromActiveFile(path) {
    if (path === null) return false;
    const object = this.deps.index.objectAt(path);
    if (object !== null && object.type === "loop") {
      if (this.selectedLoopPath === path) return false;
      this.selectedLoopPath = path;
      return true;
    }
    return false;
  }
  onIndexChanged() {
    if (this.selectedLoopPath !== null) {
      const object = this.deps.index.objectAt(this.selectedLoopPath);
      if (object === null || object.type !== "loop") {
        this.selectedLoopPath = null;
      }
    }
    this.render();
  }
  render() {
    const shell = this.container;
    if (shell === null) return;
    emptyEl(shell);
    const data = buildLoopProjection(this.deps.index, this.selectedLoopPath);
    const head = createChild(shell, "div", { cls: "rdl-head" });
    createChild(head, "div", { cls: "rdl-title", text: "Loop" });
    if (data.indexState === "INDEXING") {
      createChild(shell, "div", { cls: "rdl-state", text: "Indexing archive\u2026" });
      return;
    }
    if (data.indexState === "ERROR") {
      createChild(shell, "div", { cls: "rdl-state rdl-error", text: "Index unavailable." });
      return;
    }
    if (data.phase === "NO_LOOP_SELECTED" || data.phase === "NO_SUCH_LOOP") {
      const section3 = this.section(shell, "Loops");
      if (data.loops.length === 0) {
        createChild(shell, "div", { cls: "rdl-state", text: "No LOOP selected." });
        return;
      }
      for (const entry2 of data.loops) {
        const btn = createChild(section3, "button", { cls: "rdl-loop-pick" });
        btn.setAttribute("aria-label", `Select loop ${entry2.title}`);
        createChild(btn, "span", { cls: "rdl-loop-pick-title", text: entry2.title });
        const meta = createChild(btn, "span", { cls: "rdl-meta" });
        meta.textContent = entry2.id ?? "(no id)";
        btn.addEventListener("click", () => {
          this.selectedLoopPath = entry2.path;
          this.render();
        });
      }
      return;
    }
    this.renderIdentity(shell, data);
    this.renderRows(shell, "Recurrences", data.recurrences, "No recurrences recorded.");
    this.renderRows(shell, "Evidence", data.evidence, "No connected evidence.");
    this.renderRows(shell, "Hypotheses", data.hypotheses, "No connected hypotheses.");
    this.renderRows(shell, "Related Cases", data.cases, "No related cases.");
  }
  /** §6 + LOOP-02: canonical LOOP fields only — title, id, status,
   * path, lastVerified — as read-only safe text. */
  renderIdentity(shell, data) {
    const identity = data.selectedLoop;
    if (identity === null) return;
    const section3 = this.section(shell, "Identity");
    const idEl = createChild(section3, "div", { cls: "rdl-identity" });
    createChild(idEl, "span", { cls: "rdl-identity-title", text: identity.title });
    const meta = createChild(idEl, "span", { cls: "rdl-meta" });
    const bits = [
      identity.id ?? "(no id)",
      identity.status || "(no status)",
      identity.path
    ];
    if (identity.lastVerified !== null) bits.push("verified " + identity.lastVerified);
    meta.textContent = bits.join(" \xB7 ");
  }
  renderRows(shell, title, rows, emptyText) {
    const section3 = this.section(shell, title);
    if (rows.length === 0) {
      createChild(section3, "div", { cls: "rdl-state", text: emptyText });
      return;
    }
    for (const row of rows) {
      this.renderRow(section3, row);
    }
  }
  renderRow(section3, row) {
    const navigable = row.otherPath !== null && row.resolution === "RESOLVED";
    const el = createChild(section3, navigable ? "button" : "div", { cls: "rdl-rel" });
    if (!navigable) el.setAttribute("aria-disabled", "true");
    const line = createChild(el, "span", { cls: "rdl-rel-line" });
    line.textContent = `${row.direction === "outgoing" ? "\u2192" : "\u2190"} ${row.predicate} ${row.otherLabel}`;
    const badge = createChild(el, "span", { cls: "rdl-badge" });
    badge.textContent = row.resolution;
    badge.setAttribute("data-state", row.resolution);
    if (navigable && row.otherPath !== null) {
      const path = row.otherPath;
      el.setAttribute("aria-label", `Open ${row.otherLabel}`);
      el.addEventListener("click", () => {
        void this.deps.navigation.open({ path }, "normal");
      });
    }
  }
  section(shell, title) {
    const section3 = createChild(shell, "section", { cls: "rdl-section" });
    createChild(section3, "h3", { cls: "rdl-section-title", text: title });
    return section3;
  }
};

// src/views/investigation-view.ts
var import_obsidian5 = require("obsidian");

// src/investigation/investigation-projection.ts
var RECENT_LIMIT = 12;
function endpointNeedsAttention(resolution) {
  return resolution === "BROKEN" || resolution === "AMBIGUOUS";
}
function relationResolution(relation) {
  const states = [relation.source.resolution, relation.target.resolution];
  if (states.includes("AMBIGUOUS")) return "AMBIGUOUS";
  if (states.includes("BROKEN")) return "BROKEN";
  return "RESOLVED";
}
function needsAttention(relation) {
  return relation.predicate === "contradicts" || endpointNeedsAttention(relationResolution(relation));
}
function endpointLabel2(objectId, raw) {
  return objectId !== null && objectId.length > 0 ? objectId : raw;
}
function compareByMtimeDescPathAsc(a, b) {
  if (b.mtime !== a.mtime) return b.mtime - a.mtime;
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}
function buildInvestigationProjection(index2) {
  const { objects } = index2.snapshot();
  const relations = index2.relations;
  const counts = {
    case: 0,
    evidence: 0,
    hypothesis: 0,
    loop: 0,
    broken: 0,
    ambiguous: 0,
    contradiction: 0
  };
  for (const object of objects) {
    counts[object.type] += 1;
  }
  for (const relation of relations) {
    if (relation.predicate === "contradicts") counts.contradiction += 1;
    const states = [relation.source.resolution, relation.target.resolution];
    if (states.includes("BROKEN")) counts.broken += 1;
    if (states.includes("AMBIGUOUS")) counts.ambiguous += 1;
  }
  const relationSummary2 = /* @__PURE__ */ new Map();
  const summaryOf2 = (path) => {
    let entry2 = relationSummary2.get(path);
    if (entry2 === void 0) {
      entry2 = { resolved: 0, unresolved: 0, contradiction: 0 };
      relationSummary2.set(path, entry2);
    }
    return entry2;
  };
  for (const relation of relations) {
    const isContradiction = relation.predicate === "contradicts";
    const unresolved = endpointNeedsAttention(relationResolution(relation));
    for (const endpoint of [relation.source, relation.target]) {
      if (endpoint.path === null) continue;
      if (isContradiction) summaryOf2(endpoint.path).contradiction += 1;
      if (unresolved) summaryOf2(endpoint.path).unresolved += 1;
      if (!isContradiction && !unresolved) summaryOf2(endpoint.path).resolved += 1;
    }
  }
  const cases = objects.filter((object) => object.type === "case").sort(compareByMtimeDescPathAsc).map((object) => ({
    path: object.path,
    id: object.id,
    title: object.title,
    status: object.status,
    mtime: object.mtime,
    relations: relationSummary2.get(object.path) ?? { resolved: 0, unresolved: 0, contradiction: 0 }
  }));
  const attention2 = relations.filter((relation) => needsAttention(relation)).map((relation) => ({
    key: relation.key,
    isContradiction: relation.predicate === "contradicts",
    resolution: relationResolution(relation),
    sourceLabel: endpointLabel2(relation.source.objectId, relation.source.raw),
    sourcePath: relation.source.path,
    predicate: relation.predicate,
    targetLabel: endpointLabel2(relation.target.objectId, relation.target.raw),
    targetPath: relation.target.path,
    targetResolution: relation.targetResolution
  })).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const recent = objects.sort(compareByMtimeDescPathAsc).slice(0, RECENT_LIMIT).map((object) => ({
    path: object.path,
    type: object.type,
    id: object.id,
    title: object.title,
    mtime: object.mtime
  }));
  return {
    indexState: index2.state,
    counts,
    cases,
    attention: attention2,
    recent
  };
}

// src/views/investigation-view.ts
var RD_INVESTIGATION_VIEW_TYPE = "rd-investigation-dashboard";
var FILTERS = [
  { key: "all", label: "All" },
  { key: "cases", label: "Cases" },
  { key: "unresolved", label: "Unresolved" },
  { key: "contradictions", label: "Contradictions" }
];
function formatDate(mtime) {
  if (mtime <= 0) return "\u2014";
  return new Date(mtime).toISOString().slice(0, 10);
}
var RDInvestigationView = class extends import_obsidian5.ItemView {
  constructor(leaf, deps) {
    super(leaf);
    this.unsubscribe = null;
    this.container = null;
    this.filter = "all";
    this.deps = deps;
  }
  getViewType() {
    return RD_INVESTIGATION_VIEW_TYPE;
  }
  getDisplayText() {
    return "RD Investigation";
  }
  getIcon() {
    return "layout-list";
  }
  async onOpen() {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-investigation" });
    this.unsubscribe = this.deps.onIndexCommit(() => this.render());
    this.render();
  }
  async onClose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    emptyEl(this.contentEl);
  }
  /** §13: session-only; exists purely in this view instance. */
  setFilter(filter) {
    this.filter = filter;
    this.render();
  }
  get currentFilter() {
    return this.filter;
  }
  render() {
    const shell = this.container;
    if (shell === null) return;
    emptyEl(shell);
    const data = buildInvestigationProjection(this.deps.index);
    const head = createChild(shell, "div", { cls: "rdi-head" });
    createChild(head, "div", { cls: "rdi-title", text: "Investigation" });
    const bar = createChild(head, "div", { cls: "rdi-filters" });
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Investigation focus");
    for (const f of FILTERS) {
      const btn = createChild(bar, "button", { cls: "rdi-filter", text: f.label });
      btn.setAttribute("aria-pressed", this.filter === f.key ? "true" : "false");
      btn.setAttribute("aria-label", "Filter: " + f.label);
      btn.addEventListener("click", () => this.setFilter(f.key));
    }
    if (data.indexState === "INDEXING") {
      createChild(shell, "div", { cls: "rdi-state", text: "Indexing archive\u2026" });
      return;
    }
    if (data.indexState === "ERROR") {
      createChild(shell, "div", { cls: "rdi-state rdi-error", text: "Index unavailable." });
      return;
    }
    if (data.cases.length === 0 && data.recent.length === 0 && data.attention.length === 0) {
      createChild(shell, "div", { cls: "rdi-state", text: "No RD objects in the current index." });
      return;
    }
    this.renderKnowledgeState(shell, data);
    if (this.filter === "all" || this.filter === "cases") {
      this.renderCases(shell, data);
    }
    if (this.filter !== "cases") {
      this.renderAttention(shell, data);
    }
    if (this.filter === "all") {
      this.renderRecent(shell, data);
    }
  }
  /** §7: canonical object type counts + logical relation state counts. */
  renderKnowledgeState(shell, data) {
    const section3 = this.section(shell, "Knowledge State");
    const grid = createChild(section3, "div", { cls: "rdi-counts" });
    const entries = [
      ["CASE", data.counts.case],
      ["EVIDENCE", data.counts.evidence],
      ["HYPOTHESIS", data.counts.hypothesis],
      ["LOOP", data.counts.loop],
      ["BROKEN", data.counts.broken],
      ["AMBIGUOUS", data.counts.ambiguous],
      ["CONTRADICTION", data.counts.contradiction]
    ];
    for (const [label, value] of entries) {
      const cell = createChild(grid, "div", { cls: "rdi-count" });
      createChild(cell, "span", { cls: "rdi-count-value", text: String(value) });
      createChild(cell, "span", { cls: "rdi-count-label", text: label });
    }
  }
  /** §8: CASE rows, most recently modified first, existing model
   * fields only. Click opens the EXISTING file via the established
   * navigation path; never creates a file. */
  renderCases(shell, data) {
    const section3 = this.section(shell, "Cases");
    if (data.cases.length === 0) {
      createChild(section3, "div", { cls: "rdi-state", text: "No cases in the current index." });
      return;
    }
    for (const row of data.cases) {
      const btn = createChild(section3, "button", { cls: "rdi-case" });
      btn.setAttribute(
        "aria-label",
        `Open case ${row.title}${row.id !== null ? " (" + row.id + ")" : ""}`
      );
      createChild(btn, "span", { cls: "rdi-case-title", text: row.title });
      const meta = createChild(btn, "span", { cls: "rdi-meta" });
      meta.textContent = `${row.id ?? "(no id)"} \xB7 ${formatDate(row.mtime)} \xB7 rel ${row.relations.resolved}/${row.relations.unresolved}` + (row.relations.contradiction > 0 ? ` \xB7 contra ${row.relations.contradiction}` : "");
      btn.addEventListener("click", () => {
        void this.deps.navigation.open({ path: row.path }, "normal");
      });
    }
  }
  /** §9/INV-01: logical relations needing attention on EITHER
   * dimension — contradiction classification or unresolved endpoint.
   * §22 invariants: E != F, raw labels visible, logical dedup already
   * done by the index. */
  renderAttention(shell, data) {
    const section3 = this.section(shell, "Attention");
    const items = data.attention.filter((item) => {
      const unresolved = item.resolution === "BROKEN" || item.resolution === "AMBIGUOUS";
      if (this.filter === "unresolved") return unresolved;
      if (this.filter === "contradictions") return item.isContradiction;
      return true;
    });
    if (items.length === 0) {
      createChild(section3, "div", { cls: "rdi-state", text: "Nothing requires attention." });
      return;
    }
    for (const item of items) {
      this.renderAttentionRow(section3, item);
    }
  }
  renderAttentionRow(section3, item) {
    const navigable = item.targetPath !== null && item.targetResolution === "RESOLVED";
    const row = createChild(section3, navigable ? "button" : "div", { cls: "rdi-att" });
    if (!navigable) row.setAttribute("aria-disabled", "true");
    const line = createChild(row, "span", { cls: "rdi-att-line" });
    line.textContent = `${item.sourceLabel} ${item.predicate} ${item.targetLabel}`;
    if (item.isContradiction) {
      const badge = createChild(row, "span", { cls: "rdi-badge" });
      badge.textContent = "CONTRADICTION";
      badge.setAttribute("data-kind", "CONTRADICTION");
    }
    if (item.resolution === "BROKEN" || item.resolution === "AMBIGUOUS") {
      const badge = createChild(row, "span", { cls: "rdi-badge" });
      badge.textContent = item.resolution;
      badge.setAttribute("data-kind", item.resolution);
    }
    if (navigable && item.targetPath !== null) {
      const path = item.targetPath;
      row.setAttribute("aria-label", `Open ${item.targetLabel}`);
      row.addEventListener("click", () => {
        void this.deps.navigation.open({ path }, "normal");
      });
    }
  }
  /** §12: current filesystem metadata only; no history, no log. */
  renderRecent(shell, data) {
    const section3 = this.section(shell, "Recent");
    if (data.recent.length === 0) {
      createChild(section3, "div", { cls: "rdi-state", text: "No recent objects." });
      return;
    }
    for (const object of data.recent) {
      const btn = createChild(section3, "button", { cls: "rdi-recent" });
      btn.setAttribute("aria-label", `Open ${object.title}`);
      const line = createChild(btn, "span", { cls: "rdi-recent-line" });
      line.textContent = `${object.type} \xB7 ${object.title}`;
      const meta = createChild(btn, "span", { cls: "rdi-meta" });
      meta.textContent = formatDate(object.mtime);
      btn.addEventListener("click", () => {
        void this.deps.navigation.open({ path: object.path }, "normal");
      });
    }
  }
  section(shell, title) {
    const section3 = createChild(shell, "section", { cls: "rdi-section" });
    createChild(section3, "h3", { cls: "rdi-section-title", text: title });
    return section3;
  }
};

// src/views/rd-workspace-view.ts
var RD_WORKSPACE_VIEW_TYPE = "rd-workspace";
var AREAS = [
  { key: "Knowledge Panel", question: "What is this object?", state: "live in workspace" },
  { key: "Provenance Explorer", question: "Why do we believe this?", state: "live in workspace" },
  { key: "Lineage Explorer", question: "How did this change?", state: "live in workspace" },
  { key: "Relation Explorer", question: "What is it connected to?", state: "live in workspace" },
  {
    key: "Collaboration View",
    question: "Who worked on this and what happened?",
    state: "live in workspace"
  },
  {
    key: "Agent Contribution View",
    question: "What did Agents do here?",
    state: "live in workspace"
  }
];
var SURFACES = [
  { key: "Collaboration", mode: "collaboration" },
  { key: "Knowledge Panel", viewType: RD_KNOWLEDGE_PANEL_VIEW_TYPE },
  { key: "Graph Intelligence", viewType: RD_GRAPH_VIEW_TYPE },
  { key: "Loop Workspace", viewType: RD_LOOP_VIEW_TYPE },
  { key: "Investigation", viewType: RD_INVESTIGATION_VIEW_TYPE }
];
var REVIEW_LIMIT = 5;
var CONTRIBUTION_LIMIT = 3;
var RDWorkspaceShellView = class extends import_obsidian6.ItemView {
  constructor(leaf, deps) {
    super(leaf);
    this.unsubscribe = null;
    this.graphLoad = { state: "unavailable", reason: "not loaded yet" };
    /** Source-read ownership (review fix): a resolved detail belongs
     * to exactly one object id; reads carry a generation token so a
     * late completion from an older selection can never apply, and a
     * stable selection is read at most once (rerenders reuse the
     * completed detail instead of rereading). */
    this.sourceDetail = void 0;
    this.sourceDetailObjectId = null;
    /** Per-object in-flight ownership: at most one read per object id,
     * so re-selecting an object whose read is still pending never
     * starts a duplicate (review fix G/H). */
    this.sourceReadInFlight = /* @__PURE__ */ new Set();
    this.sourceReadToken = 0;
    /** Latest read generation per object id — a completion applies
     * only if it is still its object's latest read. */
    this.sourceReadTokenByObject = /* @__PURE__ */ new Map();
    this.observer = null;
    this.mode = "investigation";
    this.browser = new CollaborationBrowser();
    this.collabDetail = null;
    this.deps = deps;
  }
  getViewType() {
    return RD_WORKSPACE_VIEW_TYPE;
  }
  getDisplayText() {
    return "RD Workspace";
  }
  getIcon() {
    return "library";
  }
  async onOpen() {
    emptyEl(this.contentEl);
    const shell = createChild(this.contentEl, "div", { cls: "rd-workspace-shell" });
    shell.setAttribute(RD_THEME_ATTR, "");
    shell.setAttribute("data-rd-tokens", RD_TOKEN_VERSION);
    this.buildMasthead(createChild(shell, "div", { cls: "rdws-masthead" }), shell);
    createChild(shell, "div", { cls: "rdws-body" });
    if (this.deps.themeController !== void 0) {
      applyRDTheme(shell, this.deps.themeController.getCurrent());
    }
    this.unsubscribe = this.deps.store.subscribe(() => this.renderBody());
    this.observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      shell.classList.toggle("rdws-narrow", width > 0 && width < 700);
      shell.classList.toggle("rdws-mid", width >= 700 && width < 1100);
    });
    this.observer.observe(shell);
    await this.refreshAvailability();
    if (this.deps.collaborationSource !== void 0) {
      void this.browser.refresh(this.deps.collaborationSource).then(() => this.renderBody());
    }
    this.renderBody();
  }
  async onClose() {
    this.observer?.disconnect();
    this.observer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.browser.dispose();
    emptyEl(this.contentEl);
  }
  /** Masthead: investigation title + workspace scope on the left;
   * theme and exact-id query on the right. */
  buildMasthead(head, shell) {
    const left = createChild(head, "div", { cls: "rdws-masthead-left" });
    createChild(left, "h1", {
      cls: "rdws-masthead-title",
      text: "Rational Delirium"
    });
    createChild(left, "div", {
      cls: "rdws-masthead-scope",
      text: `investigation workspace \xB7 ${this.deps.store.getState().workspaceLabel}`
    });
    const right = createChild(head, "div", { cls: "rdws-masthead-right" });
    const controller = this.deps.themeController;
    if (controller !== void 0) {
      const select = createChild(right, "select", { cls: "rdws-theme-select" });
      select.setAttribute("aria-label", "RD theme (presentation only)");
      for (const theme of controller.list()) {
        const option = createChild(select, "option", { text: theme.label });
        option.value = theme.id;
        if (theme.id === controller.getCurrent().id) {
          option.selected = true;
        }
      }
      select.addEventListener("change", () => {
        try {
          const theme = controller.setTheme(select.value);
          applyRDTheme(shell, theme);
        } catch {
        }
      });
    }
    const input = createChild(right, "input", { cls: "rdws-object-input" });
    input.type = "text";
    input.placeholder = "inspect exact object_id";
    input.setAttribute("aria-label", "Knowledge object id (exact match)");
    const go = () => {
      const id = input.value.trim();
      if (id !== "") {
        this.mode = "investigation";
        this.deps.store.setSelectedObject(id);
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    createChild(right, "button", { cls: "rdws-button", text: "Inspect" }).addEventListener("click", go);
  }
  /** v1.8: explicit Human decision recording — the only write.
   * Records the decision, then re-reads artifacts and re-opens the
   * same proposal so the Human sees the recorded state. */
  async recordProposalDecision(decision, path) {
    const port = this.deps.decisionPort;
    const source = this.deps.collaborationSource;
    if (port === void 0 || source === void 0) return;
    const result = await port.recordDecision(path, decision);
    if (result.state === "written") {
      await this.browser.refresh(source);
      this.browser.select("proposal", path);
      await this.refreshCollabDetail();
    }
  }
  /** Load the detail for the current collaboration selection
   * (exact path), then re-render. Read-only. */
  async refreshCollabDetail() {
    if (this.deps.collaborationSource === void 0) return;
    this.collabDetail = await resolveDetail(
      this.deps.collaborationSource,
      this.browser.getState()
    );
    this.renderBody();
  }
  /** Explicit re-read of derived-state availability and snapshot. */
  async refreshAvailability() {
    this.graphLoad = await loadGraphFromSource(this.deps.source);
    const load = this.graphLoad;
    if (load.state === "available") {
      this.deps.store.setSnapshotAvailability({
        state: "available",
        note: `${load.graph.nodes.length} objects, ${load.graph.edges.length} declared relations (freshness unverified)`
      });
    } else if (load.state === "missing") {
      this.deps.store.setSnapshotAvailability({
        state: "missing",
        note: "Graph artifact missing \u2014 this does not mean no knowledge exists."
      });
    } else if (load.state === "invalid") {
      this.deps.store.setSnapshotAvailability({
        state: "invalid",
        note: `Graph artifact invalid (${load.reason}).`
      });
    } else {
      this.deps.store.setSnapshotAvailability({
        state: "unavailable",
        note: `Graph artifact unavailable (${load.reason}).`
      });
    }
  }
  /** Source detail usable ONLY for the object it was read for. A
   * detail that belongs to another object is never reused — B
   * never displays A's provenance (declared-data boundary). */
  sourceDetailFor(objectId) {
    return this.sourceDetailObjectId === objectId ? this.sourceDetail : void 0;
  }
  /** One source read per selection change. Rerenders of the same
   * selection reuse the completed detail; a read in flight for an
   * object is never duplicated for that object (selection
   * oscillation A→B→A does not create a second A read). A
   * completion applies only when BOTH hold: the read is still this
   * object's latest (a per-object generation token), and the
   * object is still the CURRENT selection — a stale completion for
   * a no-longer-selected object is discarded without touching the
   * cache and without triggering a render. No timers, no retries —
   * state ownership only. */
  ensureSourceDetail(objectId) {
    const reader = this.deps.sourceReader;
    if (reader === void 0) return;
    if (this.sourceDetailObjectId === objectId && this.sourceDetail !== void 0) return;
    if (this.sourceReadInFlight.has(objectId)) return;
    this.sourceReadInFlight.add(objectId);
    const token = ++this.sourceReadToken;
    this.sourceReadTokenByObject.set(objectId, token);
    void reader.resolve(objectId).then((detail) => {
      this.sourceReadInFlight.delete(objectId);
      if ((this.sourceReadTokenByObject.get(objectId) ?? 0) !== token) {
        return;
      }
      if (this.deps.store.getState().selectedObjectId !== objectId) {
        return;
      }
      this.sourceDetail = detail;
      this.sourceDetailObjectId = objectId;
      this.renderBody();
    });
  }
  /** Enter collaboration mode focused on one proposal (from the
   * review-attention list). Explicit navigation, read-only. */
  openProposalInCollaboration(path) {
    this.mode = "collaboration";
    const source = this.deps.collaborationSource;
    if (source === void 0) return;
    void this.browser.refresh(source).then(() => {
      this.browser.select("proposal", path);
      return this.refreshCollabDetail();
    }).then(() => this.renderBody());
  }
  renderBody() {
    const body = this.contentEl.querySelector(".rdws-body");
    if (!(body instanceof HTMLElement)) return;
    emptyEl(body);
    const state = this.deps.store.getState();
    const status = createChild(body, "div", { cls: "rdws-statusline" });
    status.setAttribute("data-state", state.snapshot.state);
    status.textContent = `snapshot: ${state.snapshot.state} \u2014 ${state.snapshot.note}`;
    if (state.selectedObjectId !== null) {
      createChild(status, "span", {
        cls: "rdws-statusline-trail",
        text: ` \xB7 inspecting ${state.selectedObjectId} (UI pointer; not a lifecycle state)`
      });
    }
    const layout = createChild(body, "div", { cls: "rdws-planes" });
    this.renderNavRail(layout, state.selectedObjectId);
    const center = createChild(layout, "div", { cls: "rdws-plane-center" });
    if (this.mode === "collaboration") {
      const host = createChild(center, "div", { cls: "rdws-collaboration-host" });
      renderCollaboration(host, this.browser.getState(), this.collabDetail, {
        onSelect: (kind, path) => {
          this.browser.select(kind, path);
          void this.refreshCollabDetail();
        },
        onBack: () => {
          this.browser.back();
          void this.refreshCollabDetail();
        },
        onDecide: (decision, path) => {
          void this.recordProposalDecision(decision, path);
        }
      });
      return;
    }
    if (this.graphLoad.state === "available" && state.selectedObjectId !== null) {
      this.renderReading(center, state.selectedObjectId);
      this.ensureSourceDetail(state.selectedObjectId);
    } else {
      this.renderDeskHome(center);
    }
    this.renderInspectionPlane(layout, state.selectedObjectId);
  }
  /** LEFT — navigation rail: current selection, knowledge objects,
   * surface destinations. 200–240px; collapses under 700px. */
  renderNavRail(layout, selected) {
    const rail = createChild(layout, "nav", { cls: "rdws-plane-left" });
    rail.setAttribute("aria-label", "RD workspace navigation");
    const current = createChild(rail, "div", { cls: "rdws-nav-group" });
    createChild(current, "div", { cls: "rdws-nav-label", text: "Investigation" });
    if (selected !== null) {
      const sel = createChild(current, "div", { cls: "rdws-nav-selection" });
      createChild(sel, "div", { cls: "rdws-nav-selection-id", text: selected });
      const back = createChild(current, "button", {
        cls: "rdws-button rdws-back",
        text: "\u25C0 Back"
      });
      back.setAttribute("aria-label", "Back along investigation trail");
      back.addEventListener("click", () => this.deps.store.back());
    } else {
      createChild(current, "div", {
        cls: "rdws-nav-hint",
        text: "nothing selected \u2014 query an exact id or choose an object"
      });
    }
    const objects = createChild(rail, "div", { cls: "rdws-nav-group rdws-nav-objects" });
    createChild(objects, "div", { cls: "rdws-nav-label", text: "Knowledge Objects" });
    if (this.graphLoad.state !== "available") {
      createChild(objects, "div", {
        cls: "rdws-nav-empty",
        text: "snapshot unavailable \u2014 the vault still contains its knowledge; regenerate the derived graph with the projector when needed"
      });
    } else {
      const nodes = [...this.graphLoad.graph.nodes].sort((a, b) => a.object_id.localeCompare(b.object_id));
      if (nodes.length === 0) {
        createChild(objects, "div", { cls: "rdws-nav-empty", text: "no objects in this snapshot" });
      }
      const byKind = /* @__PURE__ */ new Map();
      for (const node2 of nodes) {
        const list2 = byKind.get(node2.kind) ?? [];
        list2.push(node2);
        byKind.set(node2.kind, list2);
      }
      const kinds = [...byKind.keys()].sort((a, b) => a.localeCompare(b));
      for (const kind of kinds) {
        const group = byKind.get(kind) ?? [];
        const heading = createChild(objects, "div", { cls: "rdws-nav-kind" });
        createChild(heading, "span", { cls: "rdws-nav-kind-name", text: kind });
        createChild(heading, "span", {
          cls: "rdws-nav-kind-count",
          text: `\xB7 ${group.length}`
        });
        for (const node2 of group) {
          const row = createChild(objects, "button", { cls: "rdws-object-row" });
          row.setAttribute("aria-label", `inspect ${node2.object_id}`);
          if (node2.object_id === selected) row.setAttribute("aria-pressed", "true");
          createChild(row, "span", { cls: "rdws-object-row-id", text: node2.object_id });
          createChild(row, "span", {
            cls: "rdws-object-row-meta",
            // kind lives in the group heading above — the row states
            // lifecycle only, no duplicated classification
            text: node2.status
          });
          createChild(row, "span", {
            cls: "rdws-object-row-title",
            text: node2.title
          });
          row.addEventListener("click", () => {
            this.mode = "investigation";
            this.deps.store.setSelectedObject(node2.object_id);
          });
        }
      }
    }
    const surfaces = createChild(rail, "div", { cls: "rdws-nav-group" });
    createChild(surfaces, "div", { cls: "rdws-nav-label", text: "Surfaces" });
    for (const surface of SURFACES) {
      const row = createChild(surfaces, "button", { cls: "rdws-surface-row" });
      row.textContent = surface.key;
      if (surface.mode === "collaboration") {
        row.classList.add("rdws-collab-toggle");
        row.setAttribute("aria-pressed", String(this.mode === "collaboration"));
        row.addEventListener("click", () => {
          this.mode = this.mode === "collaboration" ? "investigation" : "collaboration";
          if (this.mode === "collaboration" && this.deps.collaborationSource !== void 0) {
            void this.browser.refresh(this.deps.collaborationSource).then(() => this.renderBody());
          }
          this.renderBody();
        });
      } else if (surface.viewType !== void 0) {
        const viewType = surface.viewType;
        row.addEventListener("click", () => {
          void this.deps.openView(viewType);
        });
      }
    }
  }
  /** CENTER — dominant reading surface. */
  renderReading(center, selected) {
    if (this.graphLoad.state !== "available") return;
    const graph = this.graphLoad.graph;
    const node2 = graph.nodes.find((n) => n.object_id === selected);
    const host = createChild(center, "div", { cls: "rdws-reading" });
    const dossier = createChild(host, "header", { cls: "rdws-dossier" });
    const head = createChild(dossier, "div", { cls: "rdws-dossier-head" });
    createChild(head, "div", {
      cls: "rdws-dossier-eyebrow",
      text: node2 !== void 0 ? `Knowledge Object \xB7 ${node2.kind} (declared classification)` : "Knowledge Object \xB7 not in snapshot"
    });
    createChild(head, "h2", {
      cls: "rdws-ko-title",
      text: node2 !== void 0 && node2.title !== "" ? node2.title : selected
    });
    const idLine = createChild(head, "div", { cls: "rdws-ko-identity" });
    idLine.textContent = node2 !== void 0 ? `${node2.object_id} \xB7 ${node2.status} (declared lifecycle; not a validity badge)` : `${selected} \xB7 not in snapshot (declared data unavailable here)`;
    const mark = createChild(dossier, "div", { cls: "rdws-dossier-mark" });
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "\xA7";
    const strip = createChild(dossier, "dl", { cls: "rdws-identity-strip" });
    const stripItem = (label, text3, state) => {
      const item = createChild(strip, "div", { cls: "rdws-strip-item" });
      if (state !== void 0) item.setAttribute("data-state", state);
      createChild(item, "dt", { text: label });
      createChild(item, "dd", { text: text3 });
    };
    if (node2 !== void 0) {
      stripItem("kind", node2.kind);
      stripItem("lifecycle", node2.status);
      stripItem("snapshot", "derived projection \xB7 freshness unverified");
      const relationCount = graph.edges.filter((e) => e.source === selected || e.target === selected).length;
      const unresolvedCount = graph.unresolved.filter((e) => e.source === selected || e.target === selected).length;
      stripItem("relations", `${relationCount} declared${unresolvedCount > 0 ? ` \xB7 ${unresolvedCount} unresolved` : ""}`);
      const source = this.sourceDetailFor(selected);
      if (source !== void 0 && source.state === "available") {
        stripItem("source", "resolved \xB7 current-source read", "available");
        const p = source.frontmatter.provenance;
        const withText = p === void 0 ? 0 : [p.observation, p.evidence, p.inference, p.conclusion].filter((v) => v !== void 0 && v !== "").length;
        stripItem("provenance", `${withText} of 4 layers carry text`);
      } else if (source !== void 0 && source.state === "ambiguous") {
        stripItem("source", `ambiguous (${source.paths.length} notes)`, "missing");
      } else if (source !== void 0 && source.state === "missing") {
        stripItem("source", "no declaring note found", "missing");
      } else {
        stripItem("source", "not read in this session", "not_loaded");
      }
    } else {
      stripItem("snapshot", "not in snapshot", "missing");
      stripItem("source", "declared data unavailable here", "missing");
    }
    const reading = createChild(host, "div", { cls: "rdws-reading-inner" });
    const model = buildKnowledgePanelModel({
      load: this.graphLoad,
      workspace: this.deps.store.getState().workspaceLabel,
      objectId: selected,
      sourceDetail: this.sourceDetailFor(selected)
    });
    renderKnowledgePanel(reading, model, {
      onSelectObject: (objectId) => {
        this.deps.store.setSelectedObject(objectId);
      },
      // Phase 2.2: the dossier shell carries scope/status/identity;
      // the panel composes the reading content beneath it.
      composedInDossier: true
    });
    const note = createChild(host, "div", { cls: "rdws-reading-note" });
    createChild(note, "span", {
      text: "declared data only \u2014 projection eligibility is not Knowledge Object validity; no ranking, no recommendation"
    });
    createChild(note, "span", { cls: "rdws-reading-note-id", text: selected });
  }
  /** CENTER — the desk home when nothing is selected. */
  renderDeskHome(center) {
    const desk = createChild(center, "div", { cls: "rdws-desk" });
    createChild(desk, "h2", {
      cls: "rdws-desk-title",
      text: "An investigation desk for your knowledge archive"
    });
    const lead = createChild(desk, "p", { cls: "rdws-desk-lead" });
    lead.textContent = "Inspect any Knowledge Object by its exact id \u2014 identity, provenance, lineage and relations as declared. Agents contribute proposals and records; Humans decide; nothing here certifies truth.";
    const map2 = createChild(desk, "div", { cls: "rdws-desk-map" });
    createChild(map2, "div", { cls: "rdws-desk-map-title", text: "Where do I go?" });
    const list2 = createChild(map2, "dl", { cls: "rdws-desk-areas" });
    for (const area of AREAS) {
      const row = createChild(list2, "div", { cls: "rdws-area" });
      row.setAttribute("data-live", String(area.state === "live in workspace"));
      createChild(row, "dt", { text: area.key });
      createChild(row, "dd", { text: area.question });
    }
    if (this.graphLoad.state !== "available") {
      createChild(desk, "div", {
        cls: "rdws-desk-snapshot-note",
        text: this.deps.store.getState().snapshot.note + " Object inspection needs the derived snapshot; everything else in this workspace works without it."
      });
    }
  }
  /** RIGHT — inspection plane: selected object metadata, linked
   * objects, Human review attention, recent contributions,
   * diagnostics for the selection. 280–340px; collapses under
   * 1100px. Collaboration summaries live here, visually separate
   * from knowledge state. */
  renderInspectionPlane(layout, selected) {
    const plane = createChild(layout, "aside", { cls: "rdws-plane-right" });
    plane.setAttribute("aria-label", "RD inspection");
    const model = this.browser.getState().model;
    let objectZone = null;
    if (this.graphLoad.state === "available" && selected !== null) {
      objectZone = createChild(plane, "div", { cls: "rdws-insp-zone" });
      objectZone.setAttribute("data-zone", "object");
      createChild(objectZone, "div", { cls: "rdws-insp-zone-label", text: "Selected object" });
    }
    if (this.graphLoad.state === "available" && selected !== null) {
      const graph = this.graphLoad.graph;
      const node2 = graph.nodes.find((n) => n.object_id === selected);
      const obj = createChild(objectZone, "section", { cls: "rdws-insp-group" });
      createChild(obj, "div", { cls: "rdws-insp-label", text: "Object" });
      if (node2 === void 0) {
        createChild(obj, "div", {
          cls: "rdws-nav-empty",
          text: `${selected} \u2014 not in snapshot`
        });
      } else {
        const meta = createChild(obj, "dl", { cls: "rdws-insp-meta" });
        const metaRow = (k, v) => {
          createChild(meta, "dt", { text: k });
          createChild(meta, "dd", { text: v });
        };
        metaRow("id", node2.object_id);
        metaRow("kind", node2.kind);
        metaRow("lifecycle", node2.status);
        if (node2.predecessor !== null) metaRow("predecessor", node2.predecessor);
        if (node2.successor !== null) metaRow("successor", node2.successor);
      }
    }
    if (this.graphLoad.state === "available" && selected !== null) {
      const graph = this.graphLoad.graph;
      const linked = createChild(objectZone, "section", { cls: "rdws-insp-group" });
      createChild(linked, "div", { cls: "rdws-insp-label", text: "Linked objects" });
      const edges = graph.edges.filter((e) => e.source === selected || e.target === selected);
      const unresolved = graph.unresolved.filter((e) => e.source === selected || e.target === selected);
      if (edges.length === 0 && unresolved.length === 0) {
        createChild(linked, "div", {
          cls: "rdws-nav-empty",
          text: "no declared relations in this snapshot"
        });
      } else {
        for (const edge of edges) {
          const outgoing = edge.source === selected;
          const otherId = outgoing ? edge.target : edge.source;
          const row = createChild(linked, "button", { cls: "rdws-link-row" });
          row.setAttribute("data-relation", edge.relation);
          row.setAttribute("aria-label", `inspect ${otherId}`);
          createChild(row, "span", {
            cls: "rdws-link-type",
            text: outgoing ? `${edge.relation} \u2192` : `\u2190 ${edge.relation}`
          });
          createChild(row, "span", { cls: "rdws-link-id", text: otherId });
          row.addEventListener("click", () => {
            this.mode = "investigation";
            this.deps.store.setSelectedObject(otherId);
          });
        }
        for (const u of unresolved) {
          const outgoing = u.source === selected;
          const target = outgoing ? u.target : u.source;
          const row = createChild(linked, "div", { cls: "rdws-link-row rdws-link-unresolved" });
          row.setAttribute("data-relation", u.relation);
          createChild(row, "span", {
            cls: "rdws-link-type",
            text: outgoing ? `${u.relation} \u2192` : `\u2190 ${u.relation}`
          });
          createChild(row, "span", { cls: "rdws-link-id", text: target });
          createChild(row, "span", { cls: "rdws-link-state", text: "unresolved" });
        }
      }
    }
    const workspaceZone = createChild(plane, "div", { cls: "rdws-insp-zone" });
    workspaceZone.setAttribute("data-zone", "workspace");
    createChild(workspaceZone, "div", { cls: "rdws-insp-zone-label", text: "Workspace" });
    const review = createChild(workspaceZone, "section", { cls: "rdws-insp-group" });
    createChild(review, "div", { cls: "rdws-insp-label", text: "Workspace review" });
    const pending = model !== null ? model.proposals.filter((p) => p.status === "pending") : [];
    if (model === null) {
      createChild(review, "div", {
        cls: "rdws-nav-empty",
        text: "reading proposal records\u2026"
      });
    } else if (pending.length === 0) {
      createChild(review, "div", {
        cls: "rdws-nav-empty",
        text: model.proposals.length > 0 ? "No proposals awaiting decision \u2014 all recorded proposals are decided." : "No proposal records found."
      });
    } else {
      createChild(review, "div", {
        cls: "rdws-insp-count",
        text: `${pending.length} awaiting your decision`
      });
      for (const p of pending.slice(0, REVIEW_LIMIT)) {
        const row = createChild(review, "button", { cls: "rdws-review-row" });
        row.setAttribute("aria-label", `review ${p.id ?? p.path}`);
        createChild(row, "span", {
          cls: "rdws-review-id",
          text: p.id ?? "(no id declared)"
        });
        createChild(row, "span", {
          cls: "rdws-review-meta",
          text: p.target !== null ? `\u2192 ${p.target}` : p.authorAgent ?? "author not declared"
        });
        row.addEventListener("click", () => this.openProposalInCollaboration(p.path));
      }
      if (pending.length > REVIEW_LIMIT) {
        createChild(review, "div", {
          cls: "rdws-insp-more",
          text: `+ ${pending.length - REVIEW_LIMIT} more in Collaboration`
        });
      }
    }
    const contribs = createChild(workspaceZone, "section", { cls: "rdws-insp-group" });
    createChild(contribs, "div", {
      cls: "rdws-insp-label",
      text: "Recent workspace contributions"
    });
    const records = model !== null ? [...model.contributions].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, CONTRIBUTION_LIMIT) : [];
    if (records.length === 0) {
      createChild(contribs, "div", {
        cls: "rdws-nav-empty",
        text: "No contribution records found."
      });
    } else {
      for (const c of records) {
        const row = createChild(contribs, "button", { cls: "rdws-contrib-row" });
        row.setAttribute("aria-label", `inspect ${c.id ?? c.path}`);
        createChild(row, "span", {
          cls: "rdws-review-id",
          text: c.id ?? "(no id declared)"
        });
        createChild(row, "span", {
          cls: "rdws-review-meta",
          text: [
            c.performedOperation,
            c.createdAt
          ].filter((x) => x !== null).join(" \xB7 ")
        });
        row.addEventListener("click", () => {
          this.mode = "collaboration";
          if (this.deps.collaborationSource === void 0) return;
          void this.browser.refresh(this.deps.collaborationSource).then(() => {
            this.browser.select("contribution", c.path);
            return this.refreshCollabDetail();
          }).then(() => this.renderBody());
        });
      }
    }
    if (this.graphLoad.state === "available" && selected !== null) {
      const graph = this.graphLoad.graph;
      const unresolvedCount = graph.unresolved.filter((e) => e.source === selected || e.target === selected).length;
      const relationCount = graph.edges.filter((e) => e.source === selected || e.target === selected).length;
      const diagCount = graph.diagnostics.filter((d) => d.object_id === selected).length;
      const diag = createChild(plane, "section", { cls: "rdws-insp-group" });
      createChild(diag, "div", { cls: "rdws-insp-label", text: "Diagnostics" });
      const line = createChild(diag, "div", { cls: "rdws-diag-line" });
      line.textContent = `${relationCount} declared relation(s) \xB7 ${unresolvedCount} unresolved \xB7 ${diagCount} diagnostic(s) \u2014 observations, not repair requests`;
    }
  }
};

// src/views/context-view.ts
var import_obsidian7 = require("obsidian");

// src/views/object-summary.ts
function renderObjectSummary(container, data, pinned, callbacks) {
  const hadFocus = container.contains(document.activeElement);
  const focusedCls = document.activeElement instanceof HTMLElement ? document.activeElement.className : null;
  emptyEl(container);
  const head = createChild(container, "div", { cls: "rdc-head" });
  if (data.object) {
    createChild(head, "span", { cls: "rdc-id", text: data.object.id });
  }
  const pin = createChild(head, "button", {
    cls: "rdc-pin",
    text: pinned ? "Unpin" : "Pin"
  });
  pin.setAttribute("aria-pressed", pinned ? "true" : "false");
  pin.setAttribute(
    "aria-label",
    pinned ? "Unpin context target" : "Pin context target"
  );
  pin.addEventListener("click", callbacks.onPinToggle);
  if (data.phase === "ERROR") {
    createChild(container, "div", {
      cls: "rdc-state rdc-error",
      text: data.pinnedDeleted ? "Pinned target deleted" : "Context error"
    });
    return;
  }
  if (data.phase === "NO_ACTIVE_OBJECT" || !data.object) {
    createChild(container, "div", {
      cls: "rdc-state",
      text: data.indexState === "INDEXING" ? "INDEXING" : "No active RD object"
    });
    return;
  }
  createChild(container, "div", { cls: "rdc-title", text: data.object.title });
  const badges = createChild(container, "div");
  const statusBadge = createChild(badges, "span", {
    cls: "rdc-badge",
    text: data.object.status || "(no status)"
  });
  statusBadge.setAttribute("data-kind", "status");
  if (data.object.proof) {
    const b = createChild(badges, "span", { cls: "rdc-badge", text: "proof" });
    b.setAttribute("data-kind", "proof");
  }
  if (data.object.demo) {
    const b = createChild(badges, "span", { cls: "rdc-badge", text: "demo" });
    b.setAttribute("data-kind", "demo");
  }
  const verify = createChild(badges, "span", {
    cls: "rdc-badge",
    text: data.object.lastVerified ? `verified ${data.object.lastVerified}` : "never verified"
  });
  verify.setAttribute("data-kind", "verification");
  if (hadFocus && focusedCls !== null) {
    const again = container.querySelector("." + focusedCls.trim().replace(/\s+/g, "."));
    again?.focus();
  }
}

// src/views/relation-list.ts
function renderRelationList(container, data, expanded, callbacks) {
  emptyEl(container);
  if (data.indexState === "INDEXING" && data.sections.length === 0) {
    createChild(container, "div", { cls: "rdc-state", text: "INDEXING" });
    container.setAttribute("aria-busy", "true");
    return;
  }
  container.removeAttribute("aria-busy");
  for (const section3 of data.sections) {
    const sectionEl = createChild(container, "div", { cls: "rdc-section" });
    const title = createChild(sectionEl, "button", {
      cls: "rdc-section-title",
      text: section3.title
    });
    const isOpen = expanded.has(section3.key);
    title.setAttribute("aria-expanded", isOpen ? "true" : "false");
    const body = createChild(sectionEl, "div", { cls: "rdc-section-body" });
    body.style.display = isOpen ? "" : "none";
    title.addEventListener("click", () => {
      const nowOpen = body.style.display === "none";
      body.style.display = nowOpen ? "" : "none";
      title.setAttribute("aria-expanded", nowOpen ? "true" : "false");
      callbacks.onToggleSection(section3.key, nowOpen);
    });
    for (const row of section3.rows) {
      const btn = createChild(body, "button", { cls: "rdc-rel" });
      const label = createChild(btn, "span", { cls: "rdc-pred" });
      label.textContent = (row.direction === "incoming" ? "\u2190 " : "\u2192 ") + row.predicate + (row.ordinary ? " (" + (row.direction === "incoming" ? "backlink" : "linked") + ")" : "");
      createChild(btn, "span", { text: " " + row.targetTitle });
      const state = createChild(btn, "span", {
        cls: "rdc-badge",
        text: row.resolution
      });
      state.setAttribute("data-state", row.resolution);
      const actions = createChild(btn, "span", { cls: "rdc-actions" });
      const tabBtn = createChild(actions, "button", {
        cls: "rdc-act rdc-act-tab",
        text: "\u21D7"
      });
      tabBtn.setAttribute("aria-label", "Open in new tab");
      tabBtn.title = "Open in new tab";
      tabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onSelectRelationTab(row);
      });
      const splitBtn = createChild(actions, "button", {
        cls: "rdc-act rdc-act-split",
        text: "\u25A4"
      });
      splitBtn.setAttribute("aria-label", "Open in split");
      splitBtn.title = "Open in split";
      splitBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onSelectRelationSplit(row);
      });
      if (row.sourcePath !== null) {
        const src = createChild(actions, "button", {
          cls: "rdc-act rdc-src",
          text: row.sourceLine !== null ? "@" + row.sourceLine : "@"
        });
        src.setAttribute(
          "aria-label",
          row.sourceLine !== null ? "Jump to source line " + row.sourceLine : "Open source file"
        );
        src.title = "Open source";
        src.addEventListener("click", (e) => {
          e.stopPropagation();
          callbacks.onSelectRelation({ ...row, _sourceAction: true });
        });
      }
      btn.addEventListener("click", () => callbacks.onSelectRelation(row));
    }
  }
}

// src/views/context-view.ts
var RD_CONTEXT_VIEW_TYPE = "rd-context";
var RDContextView = class extends import_obsidian7.ItemView {
  constructor(leaf, controller, navigation) {
    super(leaf);
    this.unsubscribe = null;
    this.container = null;
    this.controller = controller;
    this.nav = navigation;
  }
  getViewType() {
    return RD_CONTEXT_VIEW_TYPE;
  }
  getDisplayText() {
    return "RD Context";
  }
  getIcon() {
    return "file-search";
  }
  async onOpen() {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-context" });
    this.unsubscribe = this.controller.subscribe(() => this.render());
    await this.controller.reattach();
    this.render();
  }
  async onClose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    emptyEl(this.contentEl);
  }
  render() {
    const shell = this.container;
    if (shell === null) return;
    const controller = this.controller;
    const projection = controller.projection;
    const session = controller.session;
    const focusKey = this.captureFocusKey(shell);
    emptyEl(shell);
    if (projection === null) {
      createChild(shell, "div", {
        cls: "rdc-state",
        text: controller.phase === "LOADING" ? "Loading\u2026" : "No context"
      });
      return;
    }
    const summary = createChild(shell, "div", { cls: "rdc-summary" });
    const relations = createChild(shell, "div", { cls: "rdc-relations" });
    renderObjectSummary(summary, projection, session.mode === "PINNED", {
      onPinToggle: () => void this.togglePin()
    });
    renderRelationList(relations, projection, session.expandedSections, {
      onSelectRelation: (row) => this.navigateRelation(row, "normal"),
      onSelectRelationTab: (row) => this.navigateRelation(row, "tab"),
      onSelectRelationSplit: (row) => this.navigateRelation(row, "split"),
      onToggleSection: (key, expanded) => {
        controller.setSectionExpanded(key, expanded);
      }
    });
    this.restoreFocus(shell, focusKey);
  }
  async togglePin() {
    if (this.controller.session.mode === "PINNED") await this.controller.unpin();
    else await this.controller.pin();
  }
  /** RR-03 §29: primary action opens TARGET; source action opens the
   * declaration source. RD-10 §26: tab/split mode also supported. */
  navigateRelation(row, mode = "normal") {
    if (row._sourceAction === true) {
      if (row.sourcePath === null) return;
      const target2 = { path: row.sourcePath };
      if (row.sourceLine !== null && row.sourceLine !== void 0) {
        target2.line = row.sourceLine;
        if (row.sourceRevision !== null) target2.sourceRevision = row.sourceRevision;
        target2.sourceLocator = row.sourceLocator;
      }
      this.nav.open(target2, target2.line !== void 0 ? "source" : "normal");
      return;
    }
    if (row.resolution !== "RESOLVED") return;
    const targetPath = row.targetPath ?? null;
    if (targetPath === null || targetPath.length === 0) return;
    const target = { path: targetPath };
    if (row.subpath !== null) target.subpath = row.subpath;
    this.nav.open(target, mode);
  }
  captureFocusKey(shell) {
    const active = document.activeElement;
    if (active === null || !(active instanceof HTMLElement)) return null;
    if (!shell.contains(active)) return null;
    if (active.classList.contains("rdc-pin")) return "pin";
    for (const toggle of shell.querySelectorAll(".rdc-section-title")) {
      if (toggle === active) return "section:" + (toggle.textContent ?? "");
    }
    for (const rel of shell.querySelectorAll(".rdc-rel")) {
      if (rel === active) return "rel:" + (rel.textContent ?? "").slice(0, 40);
    }
    return null;
  }
  restoreFocus(shell, key) {
    if (key === null) return;
    if (key === "pin") {
      shell.querySelector(".rdc-pin")?.focus();
      return;
    }
    if (key.startsWith("section:")) {
      const title = key.slice("section:".length);
      for (const toggle of shell.querySelectorAll(".rdc-section-title")) {
        if (toggle.textContent === title) {
          toggle.focus();
          return;
        }
      }
      shell.querySelector(".rdc-summary")?.setAttribute("tabindex", "-1");
      shell.querySelector(".rdc-summary")?.focus();
      return;
    }
    if (key.startsWith("rel:")) {
      const prefix = key.slice("rel:".length);
      for (const rel of shell.querySelectorAll(".rdc-rel")) {
        if ((rel.textContent ?? "").slice(0, 40) === prefix) {
          rel.focus();
          return;
        }
      }
      shell.setAttribute("tabindex", "-1");
      shell.focus();
      return;
    }
    shell.setAttribute("tabindex", "-1");
    shell.focus();
  }
};

// src/themes/rational-archive.ts
var RATIONAL_ARCHIVE_THEME = Object.freeze({
  id: "rational-archive",
  label: "Rational Archive",
  description: "Default RD identity: deep archive atmosphere, investigative calm.",
  tokens: Object.freeze({
    // identity
    "--rd-identity-title-text": "#D4D0C8",
    "--rd-identity-meta-text": "#A19C92",
    "--rd-identity-id-text": "#A19C92",
    "--rd-identity-rule": "#34322D",
    // provenance
    "--rd-provenance-observation-text": "#A8B6AD",
    "--rd-provenance-evidence-text": "#91B5B0",
    "--rd-provenance-inference-text": "#C6B477",
    "--rd-provenance-conclusion-text": "#D4D0C8",
    "--rd-provenance-layer-rule": "#34322D",
    // relation
    "--rd-relation-type-text": "#D4D0C8",
    "--rd-relation-endpoint-text": "#A19C92",
    "--rd-relation-unresolved-text": "#D0B77C",
    "--rd-relation-rule": "#34322D",
    // conflict
    "--rd-conflict-marker-text": "#C78683",
    "--rd-conflict-marker-rule": "#C78683",
    // availability (neutral: availability is not validity)
    "--rd-availability-available-text": "#A19C92",
    "--rd-availability-missing-text": "#D0B77C",
    "--rd-availability-ambiguous-text": "#D0B77C",
    "--rd-availability-unavailable-text": "#AAA69E",
    // lifecycle-display (labels carry meaning; color accompanies)
    "--rd-lifecycle-candidate-text": "#A19C92",
    "--rd-lifecycle-active-text": "#91B5B0",
    "--rd-lifecycle-superseded-text": "#A19C92",
    "--rd-lifecycle-archived-text": "#A19C92",
    // surface
    "--rd-surface-base": "#11110F",
    "--rd-surface-raised": "#1D1C19",
    "--rd-surface-rule": "#34322D",
    "--rd-surface-focus-rule": "#D8C89D"
  })
});
function createDefaultThemeRegistry() {
  const registry = new RDThemeRegistry();
  registry.register(RATIONAL_ARCHIVE_THEME);
  return registry;
}

// src/architecture/rd-view-setup.ts
function buildRDViewRegistry() {
  const registry = new RDViewRegistry();
  registry.add({
    viewType: RD_CONTEXT_VIEW_TYPE,
    displayText: "Open RD Context",
    icon: "file-search",
    placement: "right",
    commandId: "open-rd-context",
    commandName: "Open RD Context",
    ribbonIcon: "file-search",
    createView: (leaf, services) => new RDContextView(
      leaf,
      services.controller,
      services.navigation
    )
  });
  registry.add({
    viewType: RD_INVESTIGATION_VIEW_TYPE,
    displayText: "Open RD Investigation",
    icon: "layout-list",
    placement: "main",
    commandId: "open-rd-investigation",
    commandName: "Open RD Investigation",
    ribbonIcon: "layout-list",
    createView: (leaf, services) => new RDInvestigationView(leaf, viewDeps(services))
  });
  registry.add({
    viewType: RD_LOOP_VIEW_TYPE,
    displayText: "Open RD Loop Workspace",
    icon: "iteration-ccw",
    placement: "main",
    commandId: "open-rd-loop-workspace",
    commandName: "Open RD Loop Workspace",
    ribbonIcon: "iteration-ccw",
    createView: (leaf, services) => new RDLoopView(leaf, liveDeps(services))
  });
  registry.add({
    viewType: RD_GRAPH_VIEW_TYPE,
    displayText: "Open RD Graph Intelligence",
    icon: "git-fork",
    placement: "main",
    commandId: "open-rd-graph-intelligence",
    commandName: "Open RD Graph Intelligence",
    ribbonIcon: "git-fork",
    createView: (leaf, services) => new RDGraphIntelligenceView(leaf, liveDeps(services))
  });
  registry.add({
    viewType: RD_KNOWLEDGE_PANEL_VIEW_TYPE,
    displayText: "Open RD Knowledge Panel",
    icon: "book-open",
    placement: "main",
    commandId: "open-rd-knowledge-panel",
    commandName: "Open RD Knowledge Panel",
    ribbonIcon: "book-open",
    createView: (leaf, services) => new RDKnowledgePanelView(leaf, {
      source: services.graphSource,
      sourceReader: services.koSourceReader,
      workspace: "default"
    })
  });
  registry.add({
    viewType: RD_WORKSPACE_VIEW_TYPE,
    displayText: "Open RD Workspace",
    icon: "library",
    placement: "main",
    commandId: "open-rd-workspace",
    commandName: "Open RD Workspace",
    ribbonIcon: "library",
    createView: (leaf, services) => new RDWorkspaceShellView(leaf, {
      store: services.workspaceStore,
      source: services.graphSource,
      sourceReader: services.koSourceReader,
      collaborationSource: services.collaborationSource,
      decisionPort: services.decisionPort,
      openView: services.openView,
      themeController: services.themeController
    })
  });
  return registry;
}
function viewDeps(services) {
  return {
    index: services.index,
    onIndexCommit: services.onIndexCommit,
    navigation: services.navigation
  };
}
function liveDeps(services) {
  return {
    ...viewDeps(services),
    onActiveFile: services.onActiveFile,
    activeFileProvider: services.activeFileProvider
  };
}
function registerRDViews(plugin, services) {
  const registry = buildRDViewRegistry();
  const workspaceStore = new RDWorkspaceStore();
  const themeController = new RDThemeController(
    createDefaultThemeRegistry(),
    "rational-archive"
  );
  const openView = async (viewType) => {
    const reg = registry.get(viewType);
    if (reg === void 0) return;
    await activateRDView(plugin, reg);
  };
  registry.registerAll({
    plugin,
    services: { ...services, workspaceStore, openView, themeController }
  });
  return registry;
}

// src/semantic-graph/ko-detail-reader.ts
function extractFrontmatterBlock(text3) {
  const normalized = text3.replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const lines = normalized.split("\n");
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return lines.slice(1, i).join("\n");
  }
  return null;
}
function scalar(raw) {
  let v = raw.trim();
  if (v === "" || v === "null" || v === "~") return void 0;
  const q = v[0];
  if (q === '"' || q === "'") {
    const end = v.indexOf(q, 1);
    if (end === -1) return void 0;
    return v.slice(1, end) || void 0;
  }
  const comment = v.indexOf(" #");
  if (comment !== -1) v = v.slice(0, comment).trim();
  return v === "" || v === "null" ? void 0 : v;
}
function parseKoFrontmatter(block) {
  const lines = block.split("\n");
  const scalars = {};
  const createdFrom = [];
  const provenance = {};
  let i = 0;
  let inCreatedFrom = false;
  let inProvenance = false;
  while (i < lines.length) {
    const line = lines[i];
    const top = /^([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(line);
    const nested = /^\s+([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(line);
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (top) {
      inCreatedFrom = false;
      inProvenance = false;
      const key = top[1];
      if (key === "created_from") {
        inCreatedFrom = true;
        const rest = top[2].trim();
        if (rest === "[]") {
          inCreatedFrom = false;
          i++;
          continue;
        }
        if (rest !== "") {
          inCreatedFrom = false;
          i++;
          continue;
        }
      } else if (key === "provenance") {
        inProvenance = true;
        i++;
        continue;
      } else {
        scalars[key] = scalar(top[2]);
      }
    } else if (inProvenance && nested) {
      provenance[nested[1]] = scalar(nested[2]);
    } else if (inCreatedFrom && item) {
      const v = scalar(item[1]);
      if (v !== void 0) createdFrom.push(v);
    }
    i++;
  }
  const objectId = scalars.object_id;
  if (objectId === void 0) return null;
  const hasProvenanceKeys = provenance.observation !== void 0 || provenance.evidence !== void 0 || provenance.inference !== void 0 || provenance.conclusion !== void 0;
  return {
    object_id: objectId,
    kind: scalars.kind,
    status: scalars.status,
    title: scalars.title,
    workspace_context: scalars.workspace_context,
    creator_role: scalars.creator_role,
    created_from: createdFrom.length > 0 ? createdFrom : void 0,
    provenance: hasProvenanceKeys ? provenance : void 0
  };
}
function koDetailFromNote(path, text3) {
  const block = extractFrontmatterBlock(text3);
  if (block === null) return { state: "missing" };
  const fm = parseKoFrontmatter(block);
  if (fm === null) return { state: "missing" };
  return { state: "available", path, frontmatter: fm };
}

// src/architecture/obsidian-graph-ports.ts
var ObsidianGraphSourceImpl = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async read() {
    const adapter = this.plugin.app.vault.adapter;
    try {
      if (!await adapter.exists(DEFAULT_SEMANTIC_GRAPH_PATH)) {
        return { state: "missing" };
      }
      return { state: "available", text: await adapter.read(DEFAULT_SEMANTIC_GRAPH_PATH) };
    } catch (err) {
      return { state: "unavailable", reason: String(err) };
    }
  }
};
var ObsidianKoSourceReaderImpl = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.index = null;
  }
  invalidate() {
    this.index = null;
  }
  async ensureIndex() {
    if (this.index !== null) return this.index;
    const map2 = /* @__PURE__ */ new Map();
    const adapter = this.plugin.app.vault.adapter;
    const files = this.plugin.app.vault.getMarkdownFiles().map((f) => f.path).sort();
    for (const path of files) {
      try {
        const text3 = await adapter.read(path);
        const block = extractFrontmatterBlock(text3);
        if (block === null) continue;
        const fm = parseKoFrontmatter(block);
        if (fm === null) continue;
        const list2 = map2.get(fm.object_id) ?? [];
        list2.push(path);
        map2.set(fm.object_id, list2);
      } catch {
      }
    }
    this.index = map2;
    return map2;
  }
  async resolve(objectId) {
    try {
      const map2 = await this.ensureIndex();
      const paths = map2.get(objectId) ?? [];
      if (paths.length === 0) return { state: "missing" };
      if (paths.length > 1) return { state: "ambiguous", paths };
      const text3 = await this.plugin.app.vault.adapter.read(paths[0]);
      return koDetailFromNote(paths[0], text3);
    } catch (err) {
      return { state: "unavailable", reason: String(err) };
    }
  }
};
var ObsidianCollaborationSourceImpl = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async readDir(dir) {
    const adapter = this.plugin.app.vault.adapter;
    try {
      const listing = await adapter.list(dir);
      const files = [];
      for (const path of listing.files) {
        if (!path.toLowerCase().endsWith(".md")) continue;
        try {
          files.push({ path, text: await adapter.read(path) });
        } catch {
        }
      }
      return { state: "available", files };
    } catch {
      return { state: "missing" };
    }
  }
};
var ObsidianProposalDecisionPortImpl = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  async recordDecision(path, decision) {
    if (!isProposalArtifactPath(path)) {
      return { state: "invalid", reason: "not a proposal artifact path" };
    }
    const adapter = this.plugin.app.vault.adapter;
    try {
      if (!await adapter.exists(path)) {
        return { state: "missing" };
      }
      const text3 = await adapter.read(path);
      const now = (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
      const result = applyDecisionToProposalText(text3, decision, now);
      if (!result.ok) {
        return { state: "invalid", reason: result.reason };
      }
      await adapter.write(path, result.text);
      return { state: "written", decision };
    } catch (err) {
      return { state: "unavailable", reason: String(err) };
    }
  }
};

// src/main.ts
var ObsidianReadAdapterImpl = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  list() {
    return this.plugin.app.vault.getMarkdownFiles().map((f) => f.path).filter((p) => isCandidatePath(p));
  }
  async read(path) {
    return await this.plugin.app.vault.adapter.read(path);
  }
  mtime(path) {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    return file instanceof import_obsidian8.TFile ? file.stat.mtime : 0;
  }
};
var ObsidianWorkspaceBridge = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  on(event, cb) {
    return this.plugin.registerEvent(
      this.plugin.app.workspace.on(event, cb)
    );
  }
  onLayoutReady(cb) {
    this.plugin.app.workspace.onLayoutReady(cb);
  }
  getActiveFile() {
    const f = this.plugin.app.workspace.getActiveFile();
    return f instanceof import_obsidian8.TFile ? { path: f.path } : null;
  }
};
var ObsidianVaultBridge = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  on(event, cb) {
    return this.plugin.registerEvent(
      this.plugin.app.vault.on(event, cb)
    );
  }
};
var RationalDeliriumPlugin = class extends import_obsidian8.Plugin {
  constructor() {
    super(...arguments);
    this.wiring = null;
    this.controller = null;
  }
  async onload() {
    const adapter = new ObsidianReadAdapterImpl(this);
    const workspace = new ObsidianWorkspaceBridge(this);
    const vault = new ObsidianVaultBridge(this);
    const navigation = new ObsidianNavigationPort(this.app);
    this.wiring = new RuntimeWiring(adapter, workspace, vault, navigation);
    this.controller = this.wiring.controller;
    const wiring = this.wiring;
    registerRDViews(this, {
      controller: this.controller,
      index: wiring.index,
      onIndexCommit: (cb) => wiring.onIndexCommit(cb),
      onActiveFile: (cb) => wiring.onActiveFile(cb),
      activeFileProvider: () => {
        const f = this.app.workspace.getActiveFile();
        return f !== null ? f.path : null;
      },
      navigation,
      graphSource: new ObsidianGraphSourceImpl(this),
      koSourceReader: new ObsidianKoSourceReaderImpl(this),
      collaborationSource: new ObsidianCollaborationSourceImpl(this),
      decisionPort: new ObsidianProposalDecisionPortImpl(this)
    });
    await this.wiring.start();
  }
  onunload() {
    this.wiring?.dispose();
    this.wiring = null;
    this.controller = null;
  }
};
