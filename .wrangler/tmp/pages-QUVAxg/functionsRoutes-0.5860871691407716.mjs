import { onRequest as __api_auth_callback_github_js_onRequest } from "D:\\xzsm\\mycode\\blog\\cloud_lens_main\\functions\\api\\auth\\callback\\github.js"
import { onRequest as __api_auth_github_js_onRequest } from "D:\\xzsm\\mycode\\blog\\cloud_lens_main\\functions\\api\\auth\\github.js"
import { onRequest as __api_auth_logout_js_onRequest } from "D:\\xzsm\\mycode\\blog\\cloud_lens_main\\functions\\api\\auth\\logout.js"
import { onRequest as __api_auth_me_js_onRequest } from "D:\\xzsm\\mycode\\blog\\cloud_lens_main\\functions\\api\\auth\\me.js"
import { onRequestGet as __imgur_proxy__vkey__js_onRequestGet } from "D:\\xzsm\\mycode\\blog\\cloud_lens_main\\functions\\imgur-proxy\\[vkey].js"
import { onRequestGet as __v2__vkey__js_onRequestGet } from "D:\\xzsm\\mycode\\blog\\cloud_lens_main\\functions\\v2\\[vkey].js"
import { onRequest as __upload_js_onRequest } from "D:\\xzsm\\mycode\\blog\\cloud_lens_main\\functions\\upload.js"

export const routes = [
    {
      routePath: "/api/auth/callback/github",
      mountPath: "/api/auth/callback",
      method: "",
      middlewares: [],
      modules: [__api_auth_callback_github_js_onRequest],
    },
  {
      routePath: "/api/auth/github",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_github_js_onRequest],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_logout_js_onRequest],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "",
      middlewares: [],
      modules: [__api_auth_me_js_onRequest],
    },
  {
      routePath: "/imgur-proxy/:vkey",
      mountPath: "/imgur-proxy",
      method: "GET",
      middlewares: [],
      modules: [__imgur_proxy__vkey__js_onRequestGet],
    },
  {
      routePath: "/v2/:vkey",
      mountPath: "/v2",
      method: "GET",
      middlewares: [],
      modules: [__v2__vkey__js_onRequestGet],
    },
  {
      routePath: "/upload",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__upload_js_onRequest],
    },
  ]