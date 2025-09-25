import { Core } from "@strapi/strapi"
import z, { ZodError } from "zod"

///////////////////////////////
// Constants
///////////////////////////////
const PLUGIN_ERROR_NAME = "Body-Enforcer"
const PLUGIN_NAME = "strapi-plugin-body-enforcer"
const PLUGIN_UID = `plugin::${PLUGIN_NAME}`
///////////////////////////////
// Constants
///////////////////////////////

///////////////////////////////
// Zod
///////////////////////////////

// Define types as JS values to be possible to use with Zod
const Types = ["string", "[string]", "number", "[number]", "file", "[file]"] as const
const NestedTypes = ["string", "[string]", "number", "[number]"] as const
type NestedBody = { [key: string]: typeof NestedTypes[number] | NestedBody }
type Body = { [T in string]: typeof Types[number] | Body }

// Zod schema to validate a nested property of the body
const NestedBodySchema: z.ZodType<NestedBody> = z.lazy(() =>
    z.object().catchall(
        z.union([
            z.literal(NestedTypes),
            NestedBodySchema
        ])
    )
)

/** Zod schema to parse if the route config body is valid */
const BodySchema: z.ZodType<Body> = z.object().catchall(
    z.union([
        z.literal(Types)
    ])
)

///////////////////////////////
// Zod
///////////////////////////////



///////////////////////////////
// Types
///////////////////////////////

/** Extension of Strapi `Core.Route` to be able to verify if there is a `config.body` inside a route */
export type CoreRouteWithBody = Core.Route & {
    config: {
        body?: object
    }
}

///////////////////////////////
// Types
///////////////////////////////



///////////////////////////////
// Classes
///////////////////////////////

/** Class responsible of parsing a Strapi `Core.Route` into a smaller object only holding the path and the body config */
export class BodyRoute {
    path: string;
    "config.body": object

    constructor(route: Core.Route) {
        // Failsafe to make sure the `config` exists
        if( !("config" in route) || !route.config )
            throw new DevError("A invalid Strapi `Core.Route` is trying to be parsed into a `BodyRoute` object, there is no config property in it")

        // Since it has `config` transform it to the custom type
        const r = route as CoreRouteWithBody

        // Failsafe to make sure the `config.body` exists
        if( !("body" in r.config) || !r.config.body )
            throw new DevError("A invalid Strapi `Core.Route` is trying to be parsed into a `BodyRoute` object, there is no body property inside the config")


        // Since the route object recieved is a api ("content-api") route but without the starting "/api", concat it
        this.path = "/api" + r.path
        this['config.body'] = r.config.body

        // Parse the 
        try {
            BodySchema.parse(r.config.body)
        } catch(error) {
            if(!(error instanceof ZodError))
                throw new DevError(`A unknown error happend when trying to parse using Zod.\n${error}`)
            throw new BodyConfigError(r, error.issues)
        }
    }

    /** Returns if the given router is valid or not to access the routes of and transform them into `BodyRoute` */
    static isValidRouter(router: Core.Router) {
        // Not a valid router is it has no routes
        if(!router.routes.length)
            return false
        // Not a valid router is is not of api type
        if(router.type !== "content-api")
            return false
        return true
    }

    /** From a valid router, get all valid routes in it */
    static getValidRoutes(router: Core.Router) {
        return router.routes.filter(r => {
            // Not valid if has no `config` property
            if(!("config" in r) || !r.config)
                return false
            // Since the route has the `config` property inside of it, verify if has the body
            const route = r as CoreRouteWithBody
            if(!("body" in route.config) || !route.config.body)
                return false
            return true
        })
    }
}

///////////////////////////////
// Classes
///////////////////////////////



///////////////////////////////
// Errors
///////////////////////////////

/** Error to when something non expected happen and its most likelly a dev fault */
class DevError extends Error {
    constructor(message: string) {
        super(message)
        this.name = `${PLUGIN_ERROR_NAME}.DevError`

        // Edit the stack to show a custom message
        this.stack = `${this.name}: ${this.message}.\nIf you received this error please contact the dev because it is not something that should happen.` 
    }
}

/** Error to when a `Core.Route` route has a invalid body configuration */
class BodyConfigError extends Error {
    details: { [key: string]: string } = {}

    constructor(route: Core.Route, zIssues: z.core.$ZodIssue[]) {
        super(`Invalid body configuration at endpoint "${route.method} ${route.path}" with handler "${route.handler}"`)
        this.name = `${PLUGIN_ERROR_NAME}.BodyConfigError`

        // Add the Zod issues into the error details
        for(const issue of zIssues) {
            if(issue.code === "invalid_value") {
                this.details[issue.path.join(".")] = issue.message
            }
        }


        this.stack = `${this.name}: ${this.message}.\ndetails: ${JSON.stringify(this.details, null, 2)}`
    }
}
///////////////////////////////
// Errors
///////////////////////////////
