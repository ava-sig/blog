import { a as useRuntimeConfig, _ as __nuxt_component_0 } from './server.mjs';
import { defineComponent, ref, mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderAttr } from 'vue/server-renderer';
import { useRoute, useRouter } from 'vue-router';
import { u as useApi } from './useApi-C3VMJlaQ.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
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
  __name: "[slug]",
  __ssrInlineRender: true,
  setup(__props) {
    var _a;
    useRoute();
    useRouter();
    useApi();
    const runtime = useRuntimeConfig();
    const apiBase = (((_a = runtime.public) == null ? void 0 : _a.apiBase) || "").replace(/\/$/, "");
    const loading = ref(false);
    const error = ref("");
    const post = ref(null);
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
    function titleToSlug(input) {
      return String(input || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    function canonicalSlug(p) {
      const t = titleToSlug((p == null ? void 0 : p.title) || "");
      return t || (p == null ? void 0 : p.slug) || (p == null ? void 0 : p.id) || "";
    }
    function postUrl(p) {
      const slug = canonicalSlug(p);
      if (!slug) return "";
      return `/p/${slug}`;
    }
    function xShareUrl(p) {
      const text = encodeURIComponent((p == null ? void 0 : p.title) || "");
      const url = encodeURIComponent(postUrl(p));
      return `https://x.com/intent/tweet?text=${text}&url=${url}`;
    }
    return (_ctx, _push, _parent, _attrs) => {
      var _a2;
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "container-page py-8" }, _attrs))} data-v-612c9da0>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/",
        class: "text-sm text-zinc-400 hover:text-zinc-200"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u2190 Back`);
          } else {
            return [
              createTextVNode("\u2190 Back")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<section class="mt-4" data-v-612c9da0>`);
      if (loading.value) {
        _push(`<div class="text-base-sub" data-v-612c9da0>Loading...</div>`);
      } else if (error.value) {
        _push(`<div class="text-rose-400" data-v-612c9da0>${ssrInterpolate(error.value)}</div>`);
      } else if (!post.value) {
        _push(`<div class="panel p-6 text-center" data-v-612c9da0>Post not found.</div>`);
      } else {
        _push(`<div class="panel card card-art reveal in p-4 relative" data-v-612c9da0><a class="card-xshare focus-ring"${ssrRenderAttr("href", xShareUrl(post.value))} target="_blank" rel="noopener noreferrer" aria-label="Share on X" title="Share on X" data-v-612c9da0><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" data-v-612c9da0><path d="M18.244 2.25h3.308l-7.227 8.26 8.49 11.24H16.27l-5.38-7.04-6.15 7.04H1.43l7.73-8.84L1 2.25h7.03l4.86 6.5 5.354-6.5zm-1.16 18.24h1.832L7.01 4.13H5.06l12.025 16.36z" data-v-612c9da0></path></svg></a><h4 class="m-0 mb-2 text-[21px] font-semibold leading-tight tracking-tight" data-v-612c9da0>${ssrInterpolate(post.value.title)}</h4><div class="prose-content prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-img:rounded-xl prose-img:shadow-subtle" data-v-612c9da0>${(_a2 = renderContent(post.value.content)) != null ? _a2 : ""}</div><div class="text-[12px] text-base-sub mt-3 pt-2 border-t border-base-border/60" data-v-612c9da0>Updated: ${ssrInterpolate(formatTs(post.value.updatedAt || post.value.createdAt))}</div></div>`);
      }
      _push(`</section></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/p/[slug].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _slug_ = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-612c9da0"]]);

export { _slug_ as default };
//# sourceMappingURL=_slug_-Bn7dqTNH.mjs.map
