self.__uv$config = {
  prefix: "/service/uv/",
  encodeUrl: (str) => {
    if (!str) return str;
    return encodeURIComponent(str);
  },
  decodeUrl: (str) => {
    if (!str) return str;
    return decodeURIComponent(str);
  },
  handler:
    "https://unpkg.com/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.handler.js",
  client:
    "https://unpkg.com/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.client.js",
  bundle:
    "https://unpkg.com/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.bundle.js",
  config: "/uv.config.js",
  sw: "https://unpkg.com/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.sw.js",
}
