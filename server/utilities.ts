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
const NestedBodySchema: z.ZodType<NestedBody> = z.lazy(() =>
    z.object().catchall(
        z.union([
            z.literal(NestedTypes),
            NestedBodySchema,
        ])
    )
)
const BodySchema: z.ZodType<Body> = z.object().catchall(
    z.union([
        z.literal(Types),
        NestedBodySchema,
    ])
)
///////////////////////////////
// Zod
///////////////////////////////



///////////////////////////////
// Types
///////////////////////////////

/** Extension of Strapi `Core.Route` to be able to verify if there is a `config.body` inside a route */
type CoreRouteWithBody = Core.Route & {
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

        // Parse the `config.body` object to verify if the end user gave a correct schema
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

/** Zod error parser that costumizes the error message so the end user know what he did wrong */
class BodyConfigError extends Error {
    details: { [key: string]: string } = {}

    constructor(route: Core.Route, zIssues: z.core.$ZodIssue[]) {
        super(`Invalid body configuration at endpoint "${route.method} ${route.path}" with handler "${route.handler}"`)
        this.name = `${PLUGIN_ERROR_NAME}.BodyConfigError`

        // Add the Zod issues into the error details
        for(const issue of zIssues) {
            this.#error(issue)
        }

        // Re-write the stack for custom message
        this.stack = `${this.name}: ${this.message}.\ndetails: ${JSON.stringify(this.details, null, 2)}`
    }

    /** Method to parse the Zod errors and add them into the details in a readable way, so the end user knows whats wrong */
    #error(zIssue: z.core.$ZodIssue, path?: PropertyKey[]) {
        const p: PropertyKey[] = []
        p.push(...path || [])
        p.push(...zIssue.path)

        // Failsafe verifying if issue is null or not
        if(!zIssue)
            return

        if(zIssue.code === "invalid_value") {
            // Mapping the message to be more readable
            this.details[p.join(".")] = zIssue.message.replace(/"/ig, "'").replace(/'\|/ig, "' | ")
            return
        }

        if(zIssue.code === "invalid_union") {
            // "invalid_unions" will always happen, since there is a z.union to merge the literals and the objects
            // Because of that all errors will first be this one
            // The errors[0] will (seems like) always be the error of "invalid_values" (string; [string]; etc)
            // And errors[1] will have the inner errors in case of the current iteration being a object
            // And together with the inner errors errors[1][0] will have a "invalid_type" expected: object if a wrong value is given
            // So searching errors[1][0] and verifying if is expected object also tells us that is a wrong value
            if(zIssue.errors[1][0].code === "invalid_type" && zIssue.errors[1][0].expected === "object") {
                this.#error(zIssue.errors[0][0], p)
                return
            }

            // Here we know that errors[1] do indeed have inner errors inside of one object
            // Iterate inner errors, since we know the current is a error because its a object with sub-errors
            for(const inner of zIssue.errors[1]) {
                this.#error(inner, p)
            }
        }
    }
}
///////////////////////////////
// Errors
///////////////////////////////
