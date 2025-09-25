'use strict';

export default {
    async enforce (ctx: any, config: any, { strapi }: any) {
        // console.log("policy")
        // console.log(ctx)
        // console.log("Config:",config)
        // tentar com middleware
        // usar strapi.app.routes.stacks procurar pela route including o METHOD e o path regex coincidir
        // depois com o path original que tem por exemplo o :documentId etc~
        // procurar por essa route no strapi.routes
        // e ver se lá está o config
        // have access to body in middleware https://stackoverflow.com/questions/65715215/how-do-i-reach-request-body-in-strapi-middleware
        return
    }
}
