'use strict'

import { FILES_MIDDLEWARE_NAME } from '../_utilities/files'
import { BODY_MIDDLEWARE_NAME } from '../_utilities/body'
import body from './body'
import files from './files'

export default {
    [BODY_MIDDLEWARE_NAME]: body,
    [FILES_MIDDLEWARE_NAME]: files,
}
