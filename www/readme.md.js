import '../dist/index.js';

function require(library) {
//   const idx = modules.findIndex(
//     (it) =>
//       it === library ||
//       it.replace(/^((@[^/]*\/)?[^/@]*)(@[^/]*)?(\/[^@]*)?$/, '$1$4') ===
//         library // removes version pinned, if any
//   );
//   if (idx === -1) throw new Error(`Import ${library} not found in project scope: ${modules}`);
//   return import('https://stg-packd-es-center.web.app/').then((module) => module['packd_export_'+idx]);
}

function typeOf(obj) {
    const type = Object.prototype.toString.call(obj).slice(8, -1);
    if (type === "Object") {
        if (typeof obj[Symbol.iterator] === "function") {
            return "Iterable";
        }
        if (String(obj.$$typeof) === "Symbol(react.element)") {
            return "React";
        }
        if (obj.$flags$ !== undefined) {
            return "Stencil";
        }
        if (obj.constructor === undefined) {
            return "Preact";
        }
        if ("nodeName" in obj && "children" in obj) {
            return "Omi";
        }
        if ("css" in obj &&
            "template" in obj &&
            "exports" in obj &&
            "name" in obj) {
            return "Riot";
        }
        if ("Component" in obj && typeOf(obj.Component) === "Riot") {
            return "RiotStory";
        }
        if ("Component" in obj && typeOf(obj.Component) === "Svelte") {
            return "SvelteStory";
        }
        if ("components" in obj && ("template" in obj || "render" in obj)) {
            return "Vue";
        }
        return obj.constructor.name;
    }
    else if (type === "Array") {
        let hasOmi = false;
        for (const x of obj) {
            if (x === null ||
                typeof x === "boolean" ||
                typeof x === "string" ||
                typeof x === "number") ;
            else if (typeOf(x) === "Omi")
                hasOmi = true;
            else {
                hasOmi = false;
                break;
            }
        }
        if (hasOmi)
            return "Omi";
    }
    else if (type === "Function") {
        const fnStr = obj.toString();
        if ("CustomElementConstructor" in obj) {
            return "Lwc";
        }
        if (fnStr.includes("extends SvelteComponent")) {
            return "Svelte";
        }
        if (fnStr.includes("_tmpl$.cloneNode(true)") ||
            fnStr.includes("_$createComponent(")) {
            return "Solid";
        }
    }
    else if (obj instanceof Element && obj.nodeType === 1) {
        return "Element";
    }
    return type;
}

async function render(require, storyResult, storyType, div) {
    switch (storyType) {
        case "Lwc": {
            div.appendChild((await require("lwc")).createElement("c-story", { is: storyResult }));
            return true;
        }
        case "TemplateResult": {
            // lit-html
            (await require("lit-html")).render(storyResult, div);
            return true;
        }
        case "Hole": {
            // uhtml
            (await require("uhtml")).render(div, storyResult);
            return true;
        }
        case "LighterHole": {
            // lighterhtml
            (await require("lighterhtml")).render(div, storyResult);
            return true;
        }
        case "Stencil": {
            const stencilClient = await require("@stencil/core/internal/client");
            if ("BUILD" in stencilClient) {
                // 1.9
                stencilClient.renderVdom(
                // no idea what to put there
                {
                    // $ancestorComponent$: undefined,
                    // $flags$: 0,
                    // $modeName$: undefined,
                    $hostElement$: div,
                    $cmpMeta$: {},
                }, storyResult);
            }
            else {
                // 1.8
                stencilClient.renderVdom(div, 
                // no idea what to put there
                {
                // $ancestorComponent$: undefined,
                // $flags$: 0,
                // $modeName$: undefined,
                // $hostElement$: div,
                }, {
                // $flags$: 0,
                // $tagName$: 'div',
                }, storyResult);
            }
            return true;
        }
        case "React": {
            (await require("react-dom")).render(storyResult, div);
            return true;
        }
        case "Preact": {
            (await require("preact")).render(storyResult, div);
            return true;
        }
        case "Omi": {
            (await require("omi")).render(storyResult, div);
            return true;
        }
        case "Riot": {
            const createComp = (await require("riot")).component(storyResult);
            createComp(document.getElementById("root"), {});
            return true;
        }
        case "RiotStory": {
            const { Component, props, options } = storyResult;
            const createComp = (await require("riot")).component(Component);
            createComp(document.getElementById("root"), props, options);
            return true;
        }
        case "Solid": {
            (await require("solid-js/dom")).render(storyResult, div);
            return true;
        }
        case "Svelte": {
            new storyResult({ target: div });
            return true;
        }
        case "SvelteStory": {
            const { Component, ...rest } = storyResult;
            new Component({ target: div, ...rest });
            return true;
        }
        case "Vue": {
            const Vue = await require("vue");
            Vue.createApp(storyResult).mount(div);
            return true;
        }
        case "Element":
        case "DocumentFragment": {
            div.appendChild(storyResult);
            return true;
        }
    }
    return false;
}

var OpenEnum = {
  CLOSED: "closed",
  TOPONLY: "top-only",
  FULL: "full"
};
class JSONElement extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({
      mode: "open"
    });
    this._value = {};
    this.open = OpenEnum.CLOSED;
  }

  set value(v) {
    this._value = v;
    this.render();
  }

  get value() {
    return this._value;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      ${JSONElement.styles}
    </style>
    ${this.renderNode(undefined, this._value, 0)}`;
  } //
  // Main Renders
  //


  renderNode(key, obj, level) {
    const type = JSONElement.objType(obj);

    switch (type) {
      case "Object":
      case "Array":
        return this.renderParent(type, key, obj, level);

      default:
        return this.renderKeyValue(key, this.renderValue(type, obj));
    }
  }

  renderValue(type, value) {
    switch (type) {
      case "Boolean":
        return `${value ? "true" : "false"}`;

      case "String":
        return `"${value}"`;

      case "Number":
        return `${value}`;

      case "Date":
        return `${value.toISOString()}`;

      case "Null":
        return "null";

      case "Undefined":
        return "undefined";

      case "Function":
      case "Symbol":
        return `${value.toString()}`;

      default:
        return `###unsupported yet###`;
    }
  }

  renderParent(type, key, value, level) {
    // Should be open?
    const isOpen = this.open === OpenEnum.FULL || this.open === OpenEnum.TOPONLY && level == 0;
    const summary = `<summary>${this.renderSummaryObject(type, key, value)}</summary>`;
    let details = "";
    const keys = Reflect.ownKeys(value);
    const nextLevel = level + 1;
    keys.forEach(key => {
      details += this.renderNode(key, value[key], nextLevel);
    });
    const detailsAttr = isOpen ? " open" : "";
    return `<details${detailsAttr}>${summary}<div>${details}</div></details>`;
  }

  renderKeyValue(key, value) {
    return `<div>${this.renderSpanKey(key)}${this.renderSpanValue(value)}</div>`;
  }

  renderSpanKey(key) {
    return key ? `<span class="key">${key}: </span>` : "";
  }

  renderSpanValue(value) {
    return value ? `<pre class="value">${value}</pre>` : "";
  }

  renderSpanLessImportant(value) {
    return value ? `<span class="less">${value}</span>` : "";
  } //
  // Summary renders
  //


  renderSummaryObject(type, key, value) {
    const maxItemsInSummary = 5;
    const frontkey = this.renderSpanKey(key);
    let openSummary = "";
    let closeSummary = "";
    let content = "";

    switch (type) {
      case "Object":
        openSummary = "Object {";
        closeSummary = "}";
        const keys = Reflect.ownKeys(value);
        content = keys.reduce((accu, key, index) => {
          if (index > maxItemsInSummary) return false;
          if (index == maxItemsInSummary) return accu + ` ${this.renderSpanLessImportant("...")}`;
          const child = value[key];
          return accu + ` ${this.renderSpanKey(key)}${this.renderSummaryValue(child)}`;
        }, "");
        break;

      case "Array":
        openSummary = `Array(${value.length}) [`;
        closeSummary = " ]";
        const trimmedArray = value.slice(0, 5);
        trimmedArray.forEach((v, i) => {
          content += ` ${this.renderSpanKey("" + i)}${this.renderSummaryValue(v)}`;
        });

        if (trimmedArray.length < value.length) {
          content += ` ${this.renderSpanLessImportant("...")}`;
        }

        break;
    }

    return `${frontkey}${openSummary} <span class="show-when-closed">${content}</span> ${closeSummary}`;
  }

  renderSummaryValue(value) {
    const type = JSONElement.objType(value);

    switch (type) {
      case "Object":
        return this.renderSpanLessImportant("{...}");

      case "Array":
        return this.renderSpanLessImportant("[...]");

      default:
        return this.renderSpanValue(this.renderValue(type, value));
    }
  } //
  // Tools
  //


  static objType(obj) {
    const type = Object.prototype.toString.call(obj).slice(8, -1);

    if (type === "Object") {
      if (typeof obj[Symbol.iterator] === "function") {
        return "Iterable";
      }

      return obj.constructor.name;
    }

    return type;
  } //
  // Styles
  //


  static get styles() {
    return `
      :host {
        font-family: monospace;
      }

      pre {
        display: inline;
      }

      details > summary:focus {
        outline: none;
      }
      
      details > div {
        padding-left: 15px;
      }

      details[open=""] > summary > .show-when-closed {
        display : none;
      }

      .key {
        color: purple;
      }

      .value {
        color: green;
      }

      .less {
        color: grey;
      }

    `;
  }

}
customElements.define("json-element", JSONElement);

async function renderWith(require, storyResult, div) {
    const storyType = typeOf(storyResult);
    const rendered = await render(require, storyResult, storyType, div);
    if (!rendered) {
        switch (storyType) {
            case "String": {
                const trimmed = storyResult.trim();
                if (trimmed.match(/^<[^>]*>[\s\S]*<\/[^>]*>$/g)) {
                    // starts and ends with html tag
                    div.innerHTML = trimmed;
                    break;
                }
            }
            default: {
                const jsonEl = document.createElement("json-element");
                jsonEl.value = storyResult;
                jsonEl.open = "full";
                div.insertAdjacentElement("beforeend", jsonEl);
                break;
            }
        }
    }
}

console.log("readme");

try {
  customElements.define('mdjs-story', class extends HTMLElement {
    constructor(){
      super();
      this.style.display = 'block';
      this.innerHTML = '<p>Loading...</p>';
    }
    set story(story){
      renderWith(require,story(),this);
    }
  });
} catch (e) {}

try {
  customElements.define('mdjs-preview', class extends HTMLElement {
    connectedCallback(){
      this.style.display = 'block';
      this.style.position = 'relative';
      this.innerHTML = `
      <mdjs-story></mdjs-story>
      <details>
        <summary style="text-align: center;user-select: none;">
          show code
        </summary>
        <pre><code class="hljs"></code></pre>
      </details>`;
    }
    set story(story){
      this.querySelector('mdjs-story').story = story;
    }
    set code(code){
      this.querySelector('code').textContent = code;
    }
  });
} catch (e) {}


const stories = [];
for (const story of stories) {
  // eslint-disable-next-line no-template-curly-in-string
  const storyEl = document.querySelector(`[mdjs-story-name="${story.key}"]`);
  storyEl.story = story.story;
  storyEl.code = story.code;
}
