import 'reflect-metadata'
import express from 'express'
import { MikroORM } from '@mikro-orm/core'
import { ApolloServer } from 'apollo-server-express'
import { __prod__, SESSION_SECRET } from './constants'
import mikroConfig from './mikro-orm.config'
import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { MyContext } from './types'

import redis from 'redis'
import session from 'express-session'
import connectRedis from 'connect-redis'

const main = async () => {
  const orm = await MikroORM.init(mikroConfig)
  await orm.getMigrator().up()

  const app = express()

  const RedisStore = connectRedis(session)
  const redisClient = redis.createClient()

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 10, // 10 days
        httpOnly: true,
        sameSite: 'lax', // csrf
        secure: __prod__, // only in https
      },
      saveUninitialized: false,
      secret: SESSION_SECRET,
      resave: false,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
  })

  apolloServer.applyMiddleware({ app })

  app.listen(4000, () => {
    console.log('Server started on localhost:4000')
  })
}

main()
