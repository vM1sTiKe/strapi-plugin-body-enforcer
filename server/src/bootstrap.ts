import type { Core } from '@strapi/strapi'
import { BodyRoute, MIDDLEWARE_NAME, PLUGIN_CONFIG_ROUTES, PLUGIN_UID } from '../utilities'

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
    // get parsed routes and save them into the plugin configurations
    const routes = getAPIRoutes(strapi)
    strapi.config.set(PLUGIN_CONFIG_ROUTES, routes)
    // Verify if middleware is in correct execution order
    checkMiddlewarePosition()
}

/** Get a list of registed routes that are configured to force body typification */
function getAPIRoutes(strapi: Core.Strapi) {
    // Array that will hold all the "content-api" routes
    const array: BodyRoute[] = []
    // Iterate apis
    for(const api of Object.values(strapi.apis)) {
        // Iterate routers of the api
        for(const router of Object.values(api.routes)) {
            // Verify if the router is valid to access routes
            if(!BodyRoute.isValidRouter(router))
                continue
            // get all valid routes of the router and push them into the array as a `BodyRoute` object
            for(const route of BodyRoute.getValidRoutes(router))
                array.push(new BodyRoute(route))
        }
    }
    return array
}

/** Search the list of active midlewares in the current Strapi instance and verify if `our` middleware is in a valid position (after the strapi::body) */
function checkMiddlewarePosition() {
    const STRAPI_MIDDLEWARE = "strapi::body"
    // get the middlewares list of the end user
    const middlewares: string[] = strapi.config.get("middlewares")
    // from the list, search the position of the strapi middleware that takes care of parsing the `ctx.request.body`
    const bodyI = middlewares.findIndex(m => m === STRAPI_MIDDLEWARE)
    // Search index of the plugin middleware
    const middlewareI = middlewares.findIndex(m => m === `${PLUGIN_UID}.${MIDDLEWARE_NAME}`)
    // If the index = -1 it means its not being called
    if(middlewareI === -1)
        return
    // If our middleware is above the strapi its ok
    if(middlewareI > bodyI)
        return
    // Not ok if below, cannot allow to start strapi instance in that case
    // This because the middleware NEEDS the ctx.request.body and that only exists after the strapi::body execution
    throw new Error(`Invalid "${PLUGIN_UID}.${MIDDLEWARE_NAME}" middleware positioning at "/config/middlewares.(js|ts)", make sure that its anywhere after the "${STRAPI_MIDDLEWARE}" middleware`)
}

export default bootstrap;
