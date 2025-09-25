'use strict';

import _ from "lodash";
import { Core } from "@strapi/strapi";
import type { Context, Next } from "koa";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
    async enforce (ctx: Context, next: Next) {
        // Exit middleware if the endpoint being called is not a api endpoint
        if(!ctx.request.url.startsWith("/api"))
            return next()

        console.log("\n\nmiddlewareeeeeeeeeeeeeee")
        const method = ctx.request.method
        const url = ctx.request.url

        // get all strapi routes and search for the route that is going to get called in this request
        const routes = strapi.server.listRoutes()
        const route = routes.find((route: Layer) => route.match(url) && route.methods.includes(method))
        // If there is no route exit middleware. This should only happen when strapi returns a 405 (there is no endpoint with the url fetched)
        if(!route)
            return next()


        console.log(route)

        console.log("\n\n")
        return next()
    }
})

// Since IntelliSense cant get details of strapi Router.Layer[] created this type with some of the needed properties and methods
type Layer = {
    path: string;
    methods: string[];
    regexp: RegExp;
    match: (path: string) => boolean
}
