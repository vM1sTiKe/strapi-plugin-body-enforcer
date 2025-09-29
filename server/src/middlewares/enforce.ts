'use strict'

import { Core } from "@strapi/strapi"
import { YupValidationError } from "@strapi/utils/dist/errors"
import * as yup from "yup"
import type { Context, Next } from "koa"
import { PLUGIN_CONFIG_ROUTES, BodyRoute, NestedBody, DevError } from "../../utilities"

export default (config: object, { strapi }: { strapi: Core.Strapi }) => async (ctx: Context, next: Next) => {
    // Exit middleware if the endpoint being called is not a api endpoint
    if(!ctx.request.url.startsWith("/api"))
        return next()

    // Context Request information
    const method = ctx.request.method
    const url = ctx.request.url

    // get all strapi routes
    // and using the path regex, inside the route, find the route what is going to be called
    const route = (strapi.server.listRoutes() as Layer[]).find(route => route.match(url) && route.methods.includes(method))
    // If there is no route exit middleware. This should only happen when strapi returns a 405 (there is no endpoint with the url fetched)
    if(!route)
        return next()

    // From the routes saved on the config, find the one that is currently being called
    const schema = (strapi.config.get(PLUGIN_CONFIG_ROUTES, []) as BodyRoute[]).find(r => r.path === route.path)?.["config.body"]
    if(!schema)
        return next()
    

    try {
        // Creates a yup schema from the schema created by the end user
        // Validates if the request body is following the yup schema
        const valid = await getYupSchema(schema as NestedBody).validate(ctx.request.body, { abortEarly: false })
        // If valid, remove any undefined properties inside the valid object and overwrite the request body
        ctx.request.body = getNoUndefinedInObject(valid)
    } catch(error) {
        if(!(error instanceof yup.ValidationError))
            throw new DevError(`A unknown error happend when trying to parse the request body.\n${error}`)
        // Use strapi YupValidationError to auto parse and throw the error
        const e = new YupValidationError(error)
        return ctx.badRequest(e, e.details)
    }


    console.log("\n\n")
    return next()
}

/** get a yup object from the config schema */
function getYupSchema(schema: NestedBody) {
    const obj: Record<string, any> = {}
    for(let key of Object.keys(schema)) {
        const type = getYupType(schema[key])
        // Verify if the yup type is not a yup (will be string) or if is not object
        if(typeof type === "string" && type !== "object")
            continue
        // If type is literal string object it means its a nested object, otherwise just add it the yup type
        if(typeof schema[key] === "object")
            obj[key] = getYupSchema(schema[key] as NestedBody)
        else
            obj[key] = type
    }
    return yup.object(obj).unknown(false)
}

/** removes any `undefined` values from within the given object */
function getNoUndefinedInObject(obj: { [x: string]: any }) {
    for(let key in obj) {
        // If value is undefined delete key from object
        if(obj[key] === undefined) {
            delete obj[key]
            continue
        }
        // if current iteration is a nested object call recursively this method
        if(typeof obj[key] === "object") {
            obj[key] = getNoUndefinedInObject(obj[key])
            // At the end if its a empty object also deletes it
            if(Object.keys(obj[key]).length === 0)
                delete obj[key]
        }
    }
    return obj
}

function getYupType(value: NestedBody[number]) {
    switch(value) {
        case "string": return yup.string()
        case "[string]": return yup.array().of(yup.string())
        case "number": return yup.number()
        case "[number]": return yup.array().of(yup.number())
        // Default to special types
        default:
            return typeof value
    }
}

// Since IntelliSense cant get details of strapi Router.Layer[] created this type with some of the needed properties and methods
type Layer = {
    path: string
    methods: string[]
    match: (path: string) => boolean
}
