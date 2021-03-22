import { MikroORM } from '@mikro-orm/core'
import { __prod__ } from './constants'
import { Post } from './entities/Post'

const config = {
  migrations: [],
  entities: [Post],
  dbName: 'lireddit',
  user: 'root',
  password: '123456',
  type: 'postgresql',
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0]
// } as Configuration | Options

export default config
