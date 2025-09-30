/**
 * Application methods
 */
import bootstrap from './bootstrap'

/**
 * Plugin server methods
 */
import middlewares from './middlewares'

export default {
    bootstrap,
    middlewares,
}

// TODO
// Change bootstrapi and add strapi.server.use(middlewares['body-enforce']({}, { strapi }));
// This will auto use the middlewares, making that the end user doesnt need to load them in the config/middleware file
// With that its also possible to remove the export of middlewares all together to outside of the plugin
// I have no ideia where in the list the middleware is added, but it happens after the strapi::body and that what matters
// Refactor again the plugin
// file to zod stuff
// file to errors etc etc
// Re-add the config.ts and export it (maybe im doing some bad programming not having it)
// strapi.config.get("strapi-plugin-body-enforcer") this is retorning nothing and im not sure it should have the config the end user add's into the config/plugin file
// the thing is, this is capable of accessing the config strapi.plugin("strapi-plugin-body-enforcer").config("bar") but im not sure if those configs are 2 different configs
