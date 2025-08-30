import { a as useRuntimeConfig } from './server.mjs';

function useApi() {
  var _a;
  const config = useRuntimeConfig();
  const base = ((_a = config.public) == null ? void 0 : _a.apiBase) || "";
  async function request(method, path, body) {
    const url = `${base.replace(/\/$/, "")}/api${path}`;
    const headers = { "Content-Type": "application/json" };
    try {
      if (false) ;
    } catch {
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = text || `${res.status} ${res.statusText}`;
      throw new Error(`${method} ${url} -> ${msg}`);
    }
    if (res.status === 204) return void 0;
    const ct = res.headers.get("content-type") || "";
    if (/json/i.test(ct)) return res.json();
    return void 0;
  }
  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    del: (path) => request("DELETE", path),
    async upload(path, field, file) {
      var _a2;
      const config2 = useRuntimeConfig();
      const base2 = ((_a2 = config2.public) == null ? void 0 : _a2.apiBase) || "";
      const url = `${String(base2).replace(/\/$/, "")}${path}`;
      const fd = new FormData();
      fd.append(field, file);
      const headers = {};
      const res = await fetch(url, { method: "POST", headers, body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`UPLOAD ${url} -> ${text || res.status}`);
      }
      return res.json();
    }
  };
}

export { useApi as u };
//# sourceMappingURL=useApi-C3VMJlaQ.mjs.map
