/**
 * Application methods
 */
import bootstrap from './bootstrap'
import register from './register'

/**
 * Plugin server methods
 */
import policies from './policies'
// import middlewares from './middlewares'; Do not expose the middlewared. If user wants to turn off it it can turn off the whole plugin at config/plugins.js

export default {
    register,
    bootstrap,
    policies,
}
