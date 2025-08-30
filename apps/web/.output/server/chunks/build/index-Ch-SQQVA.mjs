import { u as useAuth, a as useRuntimeConfig, _ as __nuxt_component_0 } from './server.mjs';
import { defineComponent, useSSRContext, computed, mergeProps, ref, unref, withCtx, createTextVNode, toDisplayString } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderAttr, ssrRenderList, ssrRenderComponent } from 'vue/server-renderer';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
import { useRouter, useRoute } from 'vue-router';
import { u as useApi } from './useApi-C3VMJlaQ.mjs';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "UiToast",
  __ssrInlineRender: true,
  props: {
    visible: { type: Boolean },
    type: {},
    message: {}
  },
  setup(__props) {
    const props = __props;
    const typeClass = computed(() => {
      return props.type === "error" ? "bg-rose-900/15 border-rose-700/40 text-rose-200" : "bg-emerald-900/15 border-emerald-700/40 text-emerald-200";
    });
    return (_ctx, _push, _parent, _attrs) => {
      if (_ctx.visible) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "fixed left-1/2 -translate-x-1/2 bottom-5 z-50" }, _attrs))} data-v-1edb5080><div class="${ssrRenderClass([typeClass.value, "rounded-lg border px-3 py-2 text-sm shadow-lift"])}" role="status" aria-live="polite" data-v-1edb5080>${ssrInterpolate(_ctx.message)}</div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/UiToast.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const __nuxt_component_1 = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-1edb5080"]]);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    var _a;
    useRouter();
    const route = useRoute();
    const auth = useAuth();
    useApi();
    const runtime = useRuntimeConfig();
    const apiBase = (((_a = runtime.public) == null ? void 0 : _a.apiBase) || "").replace(/\/$/, "");
    const posts = ref([]);
    const loading = ref(false);
    const error = ref("");
    const title = ref("");
    const content = ref("");
    const editingId = ref(null);
    const editTitle = ref("");
    const editContent = ref("");
    const uploading = ref(false);
    const toastVisible = ref(false);
    const toastMsg = ref("");
    const toastType = ref("success");
    function formatTs(input) {
      try {
        const d = new Date(input);
        if (isNaN(d.getTime())) return input;
        return new Intl.DateTimeFormat(void 0, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }).format(d);
      } catch {
        return input;
      }
    }
    function escapeHtml(s) {
      return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }
    function renderContent(text) {
      if (!text) return "";
      const escaped = escapeHtml(text);
      const withImages = escaped.replace(/!\[[^\]]*\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, (_m, url) => {
        let u = String(url).trim();
        u = u.replace(/^<|>$/g, "");
        u = u.replace(/^"+|"+$/g, "");
        u = u.replace(/[)]+$/g, "");
        if (u.startsWith("/uploads/")) u = `${apiBase}${u}`;
        return `<img src="${u}" alt="" />
`;
      });
      const withLinks = withImages.replace(/\[([^\]]+)\]\(\s*([^\)\s]+)(?:\s+\"[^\"]*\")?\s*\)/g, (_m, text2, url) => {
        let u = String(url).trim();
        u = u.replace(/^<|>$/g, "");
        u = u.replace(/^"+|"+$/g, "");
        u = u.replace(/[)]+$/g, "");
        const t = String(text2);
        const safeText = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<a href="${u}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
      });
      return withLinks;
    }
    function postUrl(p) {
      const slug = (p == null ? void 0 : p.slug) || (p == null ? void 0 : p.id);
      if (!slug) return "";
      return `/p/${slug}`;
    }
    function xShareUrl(p) {
      const text = encodeURIComponent(p.title || "");
      const url = encodeURIComponent(postUrl(p));
      return `https://x.com/intent/tweet?text=${text}&url=${url}`;
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      const _component_UiToast = __nuxt_component_1;
      _push(`<!--[--><main class="container-page py-8" data-v-bb526135><h2 class="text-xl font-semibold tracking-tight text-base-text mb-4" data-v-bb526135>Posts</h2>`);
      if (unref(auth).editing) {
        _push(`<section class="panel-muted p-4 mt-4" data-v-bb526135><h3 class="text-base font-medium mb-3" data-v-bb526135>New Post</h3><form class="grid gap-3" data-v-bb526135><label class="block" data-v-bb526135><span class="block text-xs text-base-sub mb-1" data-v-bb526135>Title</span><input class="input new-title-input"${ssrRenderAttr("value", title.value)} placeholder="Title" required data-v-bb526135></label><label class="block" data-v-bb526135><span class="block text-xs text-base-sub mb-1" data-v-bb526135>Content</span><textarea class="input new-content-input" placeholder="Content" rows="6" data-v-bb526135>${ssrInterpolate(content.value)}</textarea></label>`);
        if (uploading.value) {
          _push(`<div class="uploading inline-flex items-center gap-2 text-xs text-base-sub -mt-1" data-v-bb526135><span class="spinner" data-v-bb526135></span> Uploading image\u2026 </div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="flex justify-end" data-v-bb526135><button class="btn-primary focus-ring" type="submit" data-v-bb526135>Create</button></div></form></section>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<section class="mt-6" data-v-bb526135>`);
      if (unref(route).query.missing === "1") {
        _push(`<div class="border border-rose-900/60 bg-rose-900/20 text-rose-300 rounded-md px-3 py-2 mb-3" data-v-bb526135> The post you tried to edit was not found. </div>`);
      } else {
        _push(`<!---->`);
      }
      if (loading.value) {
        _push(`<div class="text-base-sub" data-v-bb526135>Loading...</div>`);
      } else if (error.value) {
        _push(`<div class="text-rose-400" data-v-bb526135>${ssrInterpolate(error.value)}</div>`);
      } else {
        _push(`<!--[-->`);
        if (posts.value.length === 0) {
          _push(`<div class="panel p-6 text-center" data-v-bb526135><div class="text-base-sub mb-2" data-v-bb526135>No posts yet</div><div class="text-sm text-zinc-400" data-v-bb526135>Use edit mode to create your first post. Paste an image to attach quickly.</div></div>`);
        } else {
          _push(`<ul class="list-none p-0 grid gap-3" data-v-bb526135><!--[-->`);
          ssrRenderList(posts.value, (p) => {
            var _a2;
            _push(`<li class="panel card card-art reveal p-4 cursor-default hover-lift hover-ring focus-ring" tabindex="0" data-v-bb526135>`);
            if (!unref(auth).editing) {
              _push(ssrRenderComponent(_component_NuxtLink, {
                to: `/p/${p.slug || p.id}`,
                class: "card-link-overlay",
                "aria-hidden": "true",
                tabindex: "-1",
                onClick: () => {
                }
              }, null, _parent));
            } else {
              _push(`<!---->`);
            }
            _push(`<div class="timeline" aria-hidden="true" data-v-bb526135></div>`);
            if (unref(auth).editing) {
              _push(`<button class="card-close focus-ring" aria-label="Delete post" title="Delete" data-v-bb526135>\xD7</button>`);
            } else {
              _push(`<!---->`);
            }
            _push(`<a class="card-xshare focus-ring"${ssrRenderAttr("href", xShareUrl(p))} target="_blank" rel="noopener noreferrer" aria-label="Share on X" title="Share on X" data-v-bb526135><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" data-v-bb526135><path d="M18.244 2.25h3.308l-7.227 8.26 8.49 11.24H16.27l-5.38-7.04-6.15 7.04H1.43l7.73-8.84L1 2.25h7.03l4.86 6.5 5.354-6.5zm-1.16 18.24h1.832L7.01 4.13H5.06l12.025 16.36z" data-v-bb526135></path></svg></a>`);
            if (editingId.value === p.id) {
              _push(`<!--[--><input${ssrRenderAttr("value", editTitle.value)} class="title-input input !text-base !font-medium !mb-2" placeholder="Title" autofocus data-v-bb526135><textarea class="content-input input !min-h-[180px]" rows="6" placeholder="Content" data-v-bb526135>${ssrInterpolate(editContent.value)}</textarea>`);
              if (uploading.value) {
                _push(`<div class="uploading inline-flex items-center gap-2 text-xs text-base-sub mt-2" data-v-bb526135><span class="spinner" data-v-bb526135></span> Uploading image\u2026 </div>`);
              } else {
                _push(`<!---->`);
              }
              _push(`<!--]-->`);
            } else {
              _push(`<!--[--><h4 class="m-0 mb-2 text-[21px] font-semibold leading-tight tracking-tight" data-v-bb526135>`);
              _push(ssrRenderComponent(_component_NuxtLink, {
                to: `/p/${p.slug || p.id}`,
                class: "no-underline text-base-text hover:text-indigo-300 focus-ring",
                onClick: () => {
                }
              }, {
                default: withCtx((_, _push2, _parent2, _scopeId) => {
                  if (_push2) {
                    _push2(`${ssrInterpolate(p.title)}`);
                  } else {
                    return [
                      createTextVNode(toDisplayString(p.title), 1)
                    ];
                  }
                }),
                _: 2
              }, _parent));
              _push(`</h4><div class="prose-content prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-img:rounded-xl prose-img:shadow-subtle" data-v-bb526135>${(_a2 = renderContent(p.content)) != null ? _a2 : ""}</div><!--]-->`);
            }
            _push(`<div class="text-[12px] text-base-sub mt-3 pt-2 border-t border-base-border/60" data-v-bb526135>Updated: ${ssrInterpolate(formatTs(p.updatedAt || p.createdAt))}</div></li>`);
          });
          _push(`<!--]--></ul>`);
        }
        _push(`<!--]-->`);
      }
      _push(`</section></main>`);
      _push(ssrRenderComponent(_component_UiToast, {
        visible: toastVisible.value,
        type: toastType.value,
        message: toastMsg.value
      }, null, _parent));
      _push(`<!--]-->`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bb526135"]]);

export { index as default };
//# sourceMappingURL=index-Ch-SQQVA.mjs.map
