'use strict'

import { Core } from "@strapi/strapi"
import type { Context, Next } from "koa"
import { PLUGIN_CONFIG_ROUTES, BodyRoute } from "../../utilities"

export default (config: object, { strapi }: { strapi: Core.Strapi }) => async (ctx: Context, next: Next) => {
    // Exit middleware if the endpoint being called is not a api endpoint
    if(!ctx.request.url.startsWith("/api"))
        return next()

    const method = ctx.request.method
    const url = ctx.request.url

    // get all strapi routes
    // and using the path regex, inside the route, find the route what is going to be called
    const route: Layer | null = strapi.server.listRoutes().find((route: Layer) => route.match(url) && route.methods.includes(method))
    // If there is no route exit middleware. This should only happen when strapi returns a 405 (there is no endpoint with the url fetched)
    if(!route)
        return next()

    // From the routes saved on the config, find the one that is currently being called
    const routes: BodyRoute[] = strapi.config.get(PLUGIN_CONFIG_ROUTES, [])
    const configBody = routes.find(r => r.path === route.path)?.["config.body"]
    if(!configBody)
        return next()
    
    console.log(configBody)

    console.log(ctx.request.body)

    console.log("\n\n")
    return next()
}

// Since IntelliSense cant get details of strapi Router.Layer[] created this type with some of the needed properties and methods
type Layer = {
    path: string
    methods: string[]
    match: (path: string) => boolean
}
