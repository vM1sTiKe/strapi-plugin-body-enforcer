import type { Core } from '@strapi/strapi'
import { bootstraps } from "./_utilities"

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
    // Execute bootstraps
    for(const _ of Object.values(bootstraps))
        _(strapi)
}

export default bootstrap;
