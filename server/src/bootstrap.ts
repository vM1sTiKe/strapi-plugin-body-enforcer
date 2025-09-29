import type { Core } from '@strapi/strapi'
import { MIDDLEWARE_NAME, PLUGIN_CONFIG_SCHEMAS, PLUGIN_UID, Schema, type RouteWithConfig, getRouteIdentification } from '../utilities'

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
    // Verify if middleware is in correct execution order
    isMiddlewareValidPosition(strapi)
    // get api routes with schemas in their config properties
    strapi.config.set(PLUGIN_CONFIG_SCHEMAS, getAPIRoutesWithSchemas(strapi))
}

/** Get a list of registed routes that are configured to force body typification */
function getAPIRoutesWithSchemas(strapi: Core.Strapi) {
    // Array that will hold all the "content-api" routes
    const schemas: Record<string, Schema> = {}
    // Iterate apis
    for(const api of Object.values(strapi.apis)) {
        // Iterate routers of the api
        for(const router of Object.values(api.routes)) {
            // Verify if the router is valid to access routes
            if(!isValidRouter(router))
                continue
            // get all valid routes of the router and add them into the schemas
            for(const route of getRouterRoutes(router)) {
                // If the route is in this loop, it means its a valid route and can be casted to "RouteWithConfig"
                schemas[getRouteIdentification(route.method, route.path)] = new Schema(route as RouteWithConfig)
            }
        }
    }
    return schemas
}


/** Returns if the given router is valid, being of type === `content-api` and having routes */
function isValidRouter(router: Core.Router) {
    // Not a valid router is it has no routes
    if(!router.routes.length)
        return false
    // Not a valid router is is not of api type
    if(router.type !== "content-api")
        return false
    return true
}

/** get a list of api routes (type === `content-type`) from the given router */
function getRouterRoutes(router: Core.Router) {
    return router.routes.filter(r => {
        // Not valid if has no `config` property
        if(!("config" in r) || !r.config)
            return false
        // Since the route has the `config` property inside of it, verify if has any of the wanted schemas (body; files)
        const route = r as RouteWithConfig
        // Verifies if has the body schema
        if("body" in route.config && route.config.body)
            return true
        // Verifies if has the files schema
        if("files" in route.config && route.config.files)
            return true
        return false
    })
}



/** Search the list of active midlewares in the current Strapi instance and verify if `our` middleware is in a valid position (after the strapi::body) */
function isMiddlewareValidPosition(strapi: Core.Strapi) {
    const STRAPI_MIDDLEWARE = "strapi::body"
    // get the middlewares list of the end user
    const middlewares: string[] = strapi.config.get("middlewares")
    // from the list, search the position of the strapi middleware that takes care of parsing the `ctx.request.body`
    const bodyI = middlewares.findIndex(m => m === STRAPI_MIDDLEWARE)
    // Search index of the plugin middleware
    const middlewareI = middlewares.findIndex(m => m === `${PLUGIN_UID}.${MIDDLEWARE_NAME}`)
    // If the index = -1 it means its not being called
    if(middlewareI === -1)
        return true
    // If our middleware is above the strapi its ok
    if(middlewareI > bodyI)
        return true
    // Not ok if below, cannot allow to start strapi instance in that case
    // This because the middleware NEEDS the ctx.request.body and that only exists after the strapi::body execution
    throw new Error(`Invalid "${PLUGIN_UID}.${MIDDLEWARE_NAME}" middleware positioning at "/config/middlewares.(js|ts)", make sure that its anywhere after the "${STRAPI_MIDDLEWARE}" middleware`)
}

export default bootstrap;
