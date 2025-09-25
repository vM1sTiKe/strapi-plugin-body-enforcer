import type { Core } from '@strapi/strapi'
import { BodyRoute } from '../utilities'

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
    // bootstrap phase
    console.log("\n\n=============================")
    console.log("Body-Enforcer Bootstrap phase")
    console.log("=============================")
    // console.log(strapi.plugins) fazer para routes de plugins

    console.log(getAPIRoutes(strapi))

    // console.log("Config: ", strapi.config.get(PLUGIN_UID + ".foo"))
    // strapi.config.set(PLUGIN_UID + ".foo", "bar")
    // console.log("Config: ", strapi.config.get(PLUGIN_UID))

    console.log("\n\n")
};



// get config object -> strapi.config.get(PLUGIN_UID)
// get config value from property -> strapi.config.get(PLUGIN_UID + ".foo")
// set config value in property -> strapi.config.set(PLUGIN_UID + ".foo", "bar")

/** Get a list of registed routes that are configured to force body typification */
function getAPIRoutes(strapi: Core.Strapi) {
    // Array that will hold all the "content-api" routes
    const array: BodyRoute[] = []
    // Iterate apis
    for(const apiName in strapi.apis) {
        const api = strapi.api(apiName)
        // Iterate routers of the api
        for(const routerName in api.routes) {
            const router = api.routes[routerName]

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
