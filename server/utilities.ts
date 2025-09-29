import type { Core } from "@strapi/strapi"
import z, { ZodError } from "zod"

///////////////////////////////
// Constants
///////////////////////////////
const PLUGIN_ERROR_NAME = "Body-Enforcer"
export const PLUGIN_NAME = "strapi-plugin-body-enforcer"
export const PLUGIN_UID = `plugin::${PLUGIN_NAME}`
export const PLUGIN_CONFIG_SCHEMAS = `${PLUGIN_UID}.schemas`
export const MIDDLEWARE_NAME = "enforce"
///////////////////////////////
// Constants
///////////////////////////////



///////////////////////////////
// Zod
///////////////////////////////

// Body Schema
const BODY_TYPES = ["string", "[string]", "number", "[number]"] as const
export type BodySchema = { [key: string]: typeof BODY_TYPES[number] | BodySchema }
const BodySchema: z.ZodType<BodySchema> = z.lazy(() =>
    z.object().catchall(
        z.union([
            z.literal(BODY_TYPES),
            BodySchema,
        ])
    )
)
// Files Schema
const FILES_TYPES = ["file", "[file]"] as const
export type FilesSchema = { [key: string]: typeof FILES_TYPES[number] }
const FilesSchema: z.ZodType<FilesSchema> = z.object().catchall(
    z.union([
        z.literal(FILES_TYPES),
    ])
)
///////////////////////////////
// Zod
///////////////////////////////



///////////////////////////////
// Classes & Types
///////////////////////////////

/** Extension of Strapi `Core.Route` with the existence of `config.body` and `config.files` properties */
export type RouteWithConfig = Core.Route & { config: { body?: BodySchema; files?: FilesSchema; } }

/** Class responsible of creating schema objects that have both `config.body` and `config.files` schemas */
export class Schema {
    body: BodySchema | undefined = undefined
    files: FilesSchema | undefined = undefined

    constructor(route: RouteWithConfig) {
        // Faisafe to api route
        if(route.info.type !== "content-api")
            throw new DevError("A invalid Strapi `Core.Route` is trying to be parsed, it is not a api route.")
        // Failsafe to make sure the `config` exists
        if(!("config" in route) || !route.config)
            throw new DevError("A invalid Strapi `Core.Route` is trying to be parsed, there is no config property in it.")
        // Failsafe to make sure the `config.body` or `config.files` exist
        if((!("body" in route.config) || !route.config.body) && (!("files" in route.config) || !route.config.files))
            throw new DevError("A invalid Strapi `Core.Route` is trying to be parsed, there is no `config.body` or `config.files` properties in it.")

        // Parse the both schemas verifying if they will throw or not errors
        try {
            BodySchema.parse(route.config.body || {})
            FilesSchema.parse(route.config.files || {})
        } catch(error) {
            if(!(error instanceof ZodError))
                throw new DevError(`A unknown error happend when trying to parse route schemas using Zod.\n${error}`)
            throw new BodyConfigError(route, error.issues)
        }
        
        // After parsing and error handling, if no error add the schemas into the properties
        this.body = route.config.body || undefined
        this.files = route.config.files || undefined
    }
}
///////////////////////////////
// Classes & Types
///////////////////////////////



///////////////////////////////
// Errors
///////////////////////////////

/** Error to when something non expected happen and its most likelly a dev fault */
export class DevError extends Error {
    constructor(message: string) {
        super(message)
        this.name = `${PLUGIN_ERROR_NAME}.DevError`

        // Edit the stack to show a custom message
        this.stack = `${this.name}: ${this.message}.\nIf you received this error please contact the dev because it is not something that should happen.\n${this.stack}` 
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
