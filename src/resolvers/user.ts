import argon from 'argon2'
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Resolver,
} from 'type-graphql'
import { MyContext } from '../types'
import { User } from '../entities/User'

@InputType()
class UserNamePasswordInput {
  @Field()
  username: string

  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string

  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
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

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username })

    if (!user) {
      return {
        errors: [
          {
            field: 'username',
            message: "Username doesn't not exist.",
          },
        ],
      }
    }

    const passwordMatches = await argon.verify(user.password, options.password)

    if (!passwordMatches) {
      return {
        errors: [
          {
            field: 'password',
            message: 'Incorrect password.',
          },
        ],
      }
    }

    return { user }
  }
}
