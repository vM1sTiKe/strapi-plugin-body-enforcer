import type { Core } from '@strapi/strapi'
import { BodyRoute, PLUGIN_CONFIG_ROUTES } from '../utilities'

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
    // get parsed routes and save them into the plugin configurations
    const routes = getAPIRoutes(strapi)
    strapi.config.set(PLUGIN_CONFIG_ROUTES, routes)
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

export default bootstrap;
