import { defineComponent, ref, watchEffect, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderStyle, ssrInterpolate, ssrRenderAttr } from 'vue/server-renderer';
import { useRoute, useRouter } from 'vue-router';
import { u as useApi } from './useApi-C3VMJlaQ.mjs';
import { u as useAuth } from './server.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[id]",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    const router = useRouter();
    useApi();
    const auth = useAuth();
    String(route.params.id || "");
    const title = ref("");
    const content = ref("");
    const loading = ref(false);
    const error = ref("");
    watchEffect(() => {
      if (!auth.editing) router.replace("/");
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<main${ssrRenderAttrs(mergeProps({ style: { "padding": "16px", "max-width": "800px", "margin": "0 auto" } }, _attrs))}><h2>Edit Post</h2>`);
      if (!unref(auth).editing) {
        _push(`<div style="${ssrRenderStyle({ "color": "#b00" })}">Editing is disabled</div>`);
      } else {
        _push(`<!---->`);
      }
      if (loading.value) {
        _push(`<div>Loading...</div>`);
      } else if (error.value) {
        _push(`<div style="${ssrRenderStyle({ "color": "#b00" })}">${ssrInterpolate(error.value)}</div>`);
      } else {
        _push(`<form style="${ssrRenderStyle({ "display": "grid", "gap": "8px" })}"><input${ssrRenderAttr("value", title.value)} placeholder="Title" required><textarea placeholder="Content" rows="10">${ssrInterpolate(content.value)}</textarea><div style="${ssrRenderStyle({ "display": "flex", "gap": "8px" })}"><button type="submit">Save</button><button type="button">Cancel</button></div></form>`);
      }
      _push(`</main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/posts/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-D1VZMkUI.mjs.map
