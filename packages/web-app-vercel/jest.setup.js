import "@testing-library/jest-dom";

// Next.js のグローバル変数をモック
global.Request = class Request {
  constructor(input, init) {
    this.url = input;
    this.method = init?.method || "GET";
    this.headers = new Headers(init?.headers || {});
    this.body = init?.body;
  }

  async json() {
    return JSON.parse(this.body);
  }
};

global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new Headers(init?.headers || {});
  }

  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  }

  async json() {
    return JSON.parse(this.body);
  }
};

global.Headers = class Headers {
  constructor(init) {
    this.map = new Map(Object.entries(init || {}));
  }

  get(name) {
    return this.map.get(name);
  }

  set(name, value) {
    this.map.set(name, value);
  }
};

import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Web Streams API
global.WritableStream = class WritableStream {
  constructor() {
    this.locked = false;
  }
  getWriter() {
    return {
      write: async () => {},
      close: async () => {},
      abort: async () => {},
      releaseLock: () => {},
    };
  }
};

global.ReadableStream = class ReadableStream {
  constructor() {
    this.locked = false;
  }
  getReader() {
    return {
      read: async () => ({ done: true, value: undefined }),
      releaseLock: () => {},
      cancel: async () => {},
    };
  }
};

global.TransformStream = class TransformStream {
  constructor() {
    this.readable = new ReadableStream();
    this.writable = new WritableStream();
  }
};
