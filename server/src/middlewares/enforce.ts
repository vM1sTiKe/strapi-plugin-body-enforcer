'use strict'

import { Core } from "@strapi/strapi"
import { YupValidationError } from "@strapi/utils/dist/errors"
import { File } from "formidable"
import * as yup from "yup"
import type { Context, Next } from "koa"
import { BodySchema, DevError, FilesSchema, getRouteIdentification, PLUGIN_CONFIG_SCHEMAS, Schema } from "../../utilities"

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
    // Remove the "/api" part of the string that is inside the Route.Layer object
    const path = route.path.replace("/api", "")

    // Search in configs for the schema of this route
    const schema = (strapi.config.get(PLUGIN_CONFIG_SCHEMAS, {}) as Record<string, Schema>)[getRouteIdentification(method, path)]
    if(!schema)
        return next()

    try {
        if(schema.body) {
            // Validates if the request body is following the yup schema and overwrite the current body, keeping only the wanted properties
            const valid = await getYupSchema(schema.body).validate(ctx.request.body, { abortEarly: false })
            // If valid, remove any undefined properties inside the valid object and overwrite the request body
            ctx.request.body = getNoUndefinedInObject(valid)
        }
        if(schema.files) {
            // Validates request files and overwrite to only keep the wanted ones
            ctx.request.files = await getYupSchema(schema.files).validate(ctx.request.files, { abortEarly: false })
        }
    } catch(error) {
        if(!(error instanceof yup.ValidationError))
            throw new DevError(`A unknown error happend when trying to parse the request body.\n${error}`)
        // Use strapi YupValidationError to auto parse and throw the error
        const _ = new YupValidationError(error)
        // Overwrite error message to always say the amount of errors
        _.message = `${_.details.errors.length} error${_.details.errors.length > 1 ? "s": ""} occurred`
        // Force the removal of the "value" values, this because (for example) when errors with files it returns non wanted data with the files
        // Also remove any extra error message, keep only the type
        _.details.errors.forEach(e => {
            delete (e as any)["value"]
            e.message = e.message.match(/^.+ must be a `\w+` type/g)?.[0] || ""
        })
        return ctx.badRequest(_, _.details)
    }
    return next()
}

/** get a yup object from the config schema */
function getYupSchema(schema: BodySchema | FilesSchema) {
    const obj: Record<string, any> = {}
    for(let key of Object.keys(schema)) {
        const type = getYupType(schema[key])
        if(!type) {
            obj[key] = getYupSchema(schema[key] as BodySchema)
            continue
        }
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

function getYupType(value: BodySchema[number] | FilesSchema[number]) {
    switch(value) {
        case "string": return yup.string()
        case "[string]": return yup.array().of(yup.string())
        case "number": return yup.number()
        case "[number]": return yup.array().of(yup.number())
        case "file": return yupfile
        case "[file]": return yup.array().of(yupfile)
        // When default it means its none of the given types, meaning it must only be a nested object
        default: return false
    }
}

const yupfile = yup.mixed().test("is-file-instance", function (value) {
    const { createError, path } = this
    // Undefined means its not present, return true in that case
    // If inside the value exists a filePath property it means its a file uploaded to Strapi
    if(value === undefined || value?.filepath)
        return true
    // Since its not a file/undefined, create custom error
    return createError({ path, message: `${path} must be a \`file\` type` })
})

// Since IntelliSense cant get details of strapi Router.Layer[] created this type with some of the needed properties and methods
type Layer = {
    path: string
    methods: string[]
    match: (path: string) => boolean
}
