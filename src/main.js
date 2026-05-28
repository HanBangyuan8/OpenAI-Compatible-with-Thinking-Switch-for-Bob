/**
 * Bob Plugin: OpenAI Compatible Translate
 * Generic OpenAI-compatible translator with optional thinking control.
 */

var DEFAULT_BASE_URL = "https://api.openai.com/v1";
var DEFAULT_MODEL = "gpt-4o-mini";

var langMap = {
  auto: "auto",
  zh: "Chinese",
  "zh-Hans": "Simplified Chinese",
  "zh-Hant": "Traditional Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  ru: "Russian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ar: "Arabic"
};

function supportLanguages() {
  return [
    "auto",
    "zh-Hans",
    "zh-Hant",
    "en",
    "ja",
    "ko",
    "fr",
    "de",
    "es",
    "it",
    "ru",
    "pt",
    "nl",
    "pl",
    "tr",
    "vi",
    "th",
    "id",
    "ar"
  ];
}

function pluginTimeoutInterval() {
  return 120;
}

function pluginValidate(completion) {
  var apiKey = getOptionString("apiKey", "");
  var baseURL = normalizeBaseURL(getOptionString("baseURL", DEFAULT_BASE_URL));
  var model = getOptionString("model", DEFAULT_MODEL);
  var authType = getOptionString("authType", "bearer");

  if (!apiKey) {
    completion({
      result: false,
      error: {
        type: "secretKey",
        message: "API Key is empty."
      }
    });
    return;
  }

  if (!baseURL || !model) {
    completion({
      result: false,
      error: {
        type: "param",
        message: "Base URL or Model is empty."
      }
    });
    return;
  }

  if (authType === "custom" && !getOptionString("customAuthHeader", "")) {
    completion({
      result: false,
      error: {
        type: "param",
        message: "Custom Auth Header is empty."
      }
    });
    return;
  }

  try {
    parseExtraBody();
  } catch (e) {
    completion({
      result: false,
      error: {
        type: "param",
        message: "Extra Body JSON is invalid: " + e.message
      }
    });
    return;
  }

  $http.request({
    method: "POST",
    url: buildChatCompletionsURL(baseURL),
    header: buildHeaders(apiKey),
    body: buildRequestBody("ping", "English", "Simplified Chinese", 16),
    timeout: 30,
    handler: function(resp) {
      if (hasHTTPError(resp)) {
        completion({
          result: false,
          error: {
            type: "api",
            message: responseErrorMessage(resp)
          }
        });
        return;
      }

      completion({ result: true });
    }
  });
}

function translate(query, completion) {
  var done = query.onCompletion || completion;
  var apiKey = getOptionString("apiKey", "");
  var baseURL = normalizeBaseURL(getOptionString("baseURL", DEFAULT_BASE_URL));
  var model = getOptionString("model", DEFAULT_MODEL);
  var authType = getOptionString("authType", "bearer");

  if (!apiKey) {
    fail(done, "secretKey", "API Key is empty.");
    return;
  }

  if (!baseURL) {
    fail(done, "param", "Base URL is empty.");
    return;
  }

  if (!model) {
    fail(done, "param", "Model is empty.");
    return;
  }

  if (authType === "custom" && !getOptionString("customAuthHeader", "")) {
    fail(done, "param", "Custom Auth Header is empty.");
    return;
  }

  var from = query.detectFrom || query.from || "auto";
  var to = query.detectTo || query.to || "zh-Hans";
  var sourceLang = langName(from);
  var targetLang = langName(to);
  var text = query.originalText || query.text || "";
  var body;

  try {
    body = buildRequestBody(text, sourceLang, targetLang, getMaxTokens());
  } catch (e) {
    fail(done, "param", "Extra Body JSON is invalid: " + e.message);
    return;
  }

  if (shouldUseStreaming(query)) {
    translateStreaming(query, done, baseURL, apiKey, body, from, to);
  } else {
    translateNonStreaming(query, done, baseURL, apiKey, body, from, to);
  }
}

function translateNonStreaming(query, done, baseURL, apiKey, body, from, to) {
  body.stream = false;

  $http.request({
    method: "POST",
    url: buildChatCompletionsURL(baseURL),
    header: buildHeaders(apiKey),
    body: body,
    timeout: 120,
    cancelSignal: query.cancelSignal,
    handler: function(resp) {
      if (hasHTTPError(resp)) {
        fail(done, "api", responseErrorMessage(resp));
        return;
      }

      var data = normalizeResponseData(resp.data);
      if (!data) {
        fail(done, "api", "Empty response.");
        return;
      }

      if (data.error) {
        fail(done, "api", formatAPIError(data.error));
        return;
      }

      var translated = extractContent(data);
      if (!translated) {
        fail(done, "api", "No translation content found: " + stringify(data));
        return;
      }

      done({
        result: {
          from: from,
          to: to,
          toParagraphs: splitParagraphs(translated)
        }
      });
    }
  });
}

function translateStreaming(query, done, baseURL, apiKey, body, from, to) {
  var state = {
    buffer: "",
    text: "",
    error: null
  };

  body.stream = true;

  $http.streamRequest({
    method: "POST",
    url: buildChatCompletionsURL(baseURL),
    header: buildHeaders(apiKey),
    body: body,
    timeout: 120,
    cancelSignal: query.cancelSignal,
    streamHandler: function(stream) {
      processStreamText(stream.text || "", state, query, from, to);
    },
    handler: function(resp) {
      processStreamText("\n", state, query, from, to);

      if (hasHTTPError(resp)) {
        if (state.text) {
          done({
            result: {
              from: from,
              to: to,
              toParagraphs: splitParagraphs(state.text)
            }
          });
          return;
        }

        fail(done, "api", responseErrorMessage(resp));
        return;
      }

      if (state.error && !state.text) {
        fail(done, "api", state.error);
        return;
      }

      if (!state.text) {
        fail(done, "api", "No translation content found in streaming response.");
        return;
      }

      done({
        result: {
          from: from,
          to: to,
          toParagraphs: splitParagraphs(state.text)
        }
      });
    }
  });
}

function buildRequestBody(text, sourceLang, targetLang, maxTokens) {
  var model = getOptionString("model", DEFAULT_MODEL);
  var systemPrompt = getOptionString("systemPrompt", defaultSystemPrompt());
  var body = parseExtraBody();
  var temperature = getNumberOption("temperature", 0.2);
  var topPText = getOptionString("topP", "0.95");
  var maxTokensParam = getOptionString("maxTokensParam", "max_completion_tokens");
  var thinkingMode = getOptionString("thinkingMode", "none");

  body.model = model;
  body.messages = [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: buildUserPrompt(text, sourceLang, targetLang)
    }
  ];
  body.stream = false;

  if (!isNaN(temperature)) {
    body.temperature = temperature;
  }

  if (topPText) {
    var topP = parseFloat(topPText);
    if (!isNaN(topP)) {
      body.top_p = topP;
    }
  }

  if (maxTokens > 0) {
    if (maxTokensParam === "max_tokens") {
      body.max_tokens = maxTokens;
      delete body.max_completion_tokens;
    } else if (maxTokensParam === "both") {
      body.max_tokens = maxTokens;
      body.max_completion_tokens = maxTokens;
    } else if (maxTokensParam === "none") {
      delete body.max_tokens;
      delete body.max_completion_tokens;
    } else {
      body.max_completion_tokens = maxTokens;
      delete body.max_tokens;
    }
  }

  if (thinkingMode === "disabled") {
    body.thinking = { type: "disabled" };
  } else if (thinkingMode === "enabled") {
    body.thinking = { type: "enabled" };
  } else {
    delete body.thinking;
  }

  return body;
}

function shouldUseStreaming(query) {
  if (getOptionString("streamingMode", "off") !== "on") {
    return false;
  }

  if (!query || typeof query.onStream !== "function") {
    return false;
  }

  if (!$http || typeof $http.streamRequest !== "function") {
    return false;
  }

  return true;
}

function processStreamText(text, state, query, from, to) {
  if (!text) {
    return;
  }

  state.buffer += text;

  var lines = state.buffer.split(/\r?\n/);
  state.buffer = lines.pop() || "";

  for (var i = 0; i < lines.length; i++) {
    processStreamLine(lines[i], state, query, from, to);
  }
}

function processStreamLine(line, state, query, from, to) {
  line = trim(line);

  if (!line || line.indexOf(":") === 0) {
    return;
  }

  if (line.indexOf("data:") !== 0) {
    return;
  }

  var payload = trim(line.slice(5));
  if (!payload) {
    return;
  }

  if (payload === "[DONE]") {
    state.buffer = "";
    return;
  }

  try {
    var data = JSON.parse(payload);
    if (data.error) {
      state.error = formatAPIError(data.error);
      return;
    }

    var content = extractDeltaContent(data);
    if (!content) {
      return;
    }

    state.text += content;
    query.onStream({
      result: {
        from: from,
        to: to,
        toParagraphs: splitParagraphs(state.text)
      }
    });
  } catch (e) {
    state.error = "Invalid streaming JSON chunk: " + payload;
  }
}

function buildUserPrompt(text, sourceLang, targetLang) {
  return [
    "Source language: " + sourceLang,
    "Target language: " + targetLang,
    "",
    "Text:",
    text
  ].join("\n");
}

function buildHeaders(apiKey) {
  var authType = getOptionString("authType", "bearer");
  var headers = {
    "Content-Type": "application/json"
  };

  if (authType === "api-key") {
    headers["api-key"] = apiKey;
  } else if (authType === "x-api-key") {
    headers["x-api-key"] = apiKey;
  } else if (authType === "authorization") {
    headers.Authorization = apiKey;
  } else if (authType === "custom") {
    var customHeader = getOptionString("customAuthHeader", "");
    if (customHeader) {
      headers[customHeader] = apiKey;
    }
  } else {
    headers.Authorization = "Bearer " + apiKey;
  }

  return headers;
}

function buildChatCompletionsURL(baseURL) {
  return normalizeBaseURL(baseURL) + "/chat/completions";
}

function normalizeBaseURL(url) {
  url = trim(url || "");

  while (url.length > 1 && url.charAt(url.length - 1) === "/") {
    url = url.slice(0, -1);
  }

  url = url.replace(/\/chat\/completions$/, "");
  return url;
}

function parseExtraBody() {
  var raw = getOptionString("extraBody", "{}");

  if (!raw) {
    return {};
  }

  var parsed = JSON.parse(raw);
  if (!parsed || Object.prototype.toString.call(parsed) !== "[object Object]") {
    throw new Error("Extra Body JSON must be an object.");
  }

  return parsed;
}

function defaultSystemPrompt() {
  return "You are a precise translation engine used inside Bob, a popup translator. " +
    "Translate the user's text into the target language. " +
    "Preserve meaning, tone, formatting, punctuation, line breaks, code blocks, URLs, names, and numbers. " +
    "Do not summarize. Do not add explanations. Only output the translated text.";
}

function langName(code) {
  return langMap[code] || code || "auto";
}

function getMaxTokens() {
  var value = parseInt(getOptionString("maxTokens", "2048"), 10);
  if (isNaN(value) || value <= 0) {
    return 2048;
  }
  return value;
}

function getNumberOption(key, fallback) {
  var value = parseFloat(getOptionString(key, String(fallback)));
  if (isNaN(value)) {
    return fallback;
  }
  return value;
}

function getOptionString(key, fallback) {
  var value = $option[key];
  if (value === undefined || value === null) {
    value = fallback;
  }
  return trim(String(value || ""));
}

function normalizeResponseData(data) {
  if (typeof data !== "string") {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function extractContent(data) {
  try {
    var choice = data.choices && data.choices[0];
    var message = choice && choice.message;

    if (!message) {
      return "";
    }

    if (typeof message.content === "string") {
      return message.content;
    }

    if (Object.prototype.toString.call(message.content) === "[object Array]") {
      return joinContentParts(message.content);
    }

    return "";
  } catch (e) {
    return "";
  }
}

function extractDeltaContent(data) {
  try {
    var choice = data.choices && data.choices[0];
    var delta = choice && choice.delta;
    var message = choice && choice.message;

    if (delta && typeof delta.content === "string") {
      return delta.content;
    }

    if (delta && Object.prototype.toString.call(delta.content) === "[object Array]") {
      return joinContentParts(delta.content);
    }

    if (message && typeof message.content === "string") {
      return message.content;
    }

    return "";
  } catch (e) {
    return "";
  }
}

function joinContentParts(parts) {
  var out = [];

  for (var i = 0; i < parts.length; i++) {
    var item = parts[i];
    if (typeof item === "string") {
      out.push(item);
    } else if (item && typeof item.text === "string") {
      out.push(item.text);
    } else if (item && typeof item.content === "string") {
      out.push(item.content);
    }
  }

  return out.join("");
}

function splitParagraphs(text) {
  text = trim(text || "");

  if (!text) {
    return [""];
  }

  return text.split(/\n{2,}/);
}

function hasHTTPError(resp) {
  if (!resp) {
    return true;
  }

  if (resp.error) {
    return true;
  }

  if (resp.response && resp.response.statusCode >= 400) {
    return true;
  }

  return false;
}

function responseErrorMessage(resp) {
  if (!resp) {
    return "No response.";
  }

  if (resp.error) {
    return "Network error: " + stringify(resp.error);
  }

  var data = normalizeResponseData(resp.data);
  var status = resp.response ? resp.response.statusCode : 0;

  if (data && data.error) {
    return "HTTP " + status + ": " + formatAPIError(data.error);
  }

  if (data) {
    return "HTTP " + status + ": " + stringify(data);
  }

  return "HTTP " + status + ": " + stringify(resp.data);
}

function formatAPIError(error) {
  if (!error) {
    return "Unknown API error.";
  }

  if (typeof error === "string") {
    return error;
  }

  var msg = error.message || stringify(error);
  if (error.code) {
    msg += " | code: " + error.code;
  }
  if (error.type) {
    msg += " | type: " + error.type;
  }
  return msg;
}

function fail(done, type, message) {
  done({
    error: {
      type: type,
      message: message
    }
  });
}

function stringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return String(obj);
  }
}

function trim(value) {
  return String(value || "").replace(/^\s+|\s+$/g, "");
}
