import type { Core } from '@strapi/strapi'
import defMiddlewares from './middlewares'

const register = ({ strapi }: { strapi: Core.Strapi }) => {
    // Setup middlewares
    for(const middleware of Object.values(defMiddlewares({ strapi }))) {
        strapi.server.use(middleware)
    }
}

export default register;
