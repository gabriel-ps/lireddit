import argon from 'argon2'
import { Arg, Ctx, Field, InputType, Mutation, Resolver } from 'type-graphql'
import { MyContext } from '../types'
import { User } from '../entities/User'

@InputType()
class UserNamePasswordInput {
  @Field()
  username: string

  @Field()
  password: string
}

@Resolver()
export class UserResolver {
  @Mutation(() => User)
  async register(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em }: MyContext
  ) {
    const user = em.create(User, {
      username: options.username,
      password: await argon.hash(options.password),
    })
    await em.persistAndFlush(user)

    return user
  }
}
