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
import { PG_UNIQUE_CONSTRAINT_VIOLATION } from '../constants'
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
  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const errors: FieldError[] = []

    if (options.username.length <= 2) {
      errors.push({
        field: 'username',
        message: 'Length must be greater than 2.',
      })
    }

    if (options.password.length <= 3) {
      errors.push({
        field: 'password',
        message: 'Length must be greater than 3.',
      })
    }

    if (errors.length) return { errors }

    const user = em.create(User, {
      username: options.username,
      password: await argon.hash(options.password),
    })

    try {
      await em.persistAndFlush(user)
    } catch (e) {
      if (e.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        if (e.constraint === 'user_username_unique') {
          errors.push({
            field: 'username',
            message: 'Username already taken',
          })
        }
      }

      /*
      if (e instanceof UniqueConstraintViolationException) {
        const constraint = ((e as unknown) as {
          constraint: string
        }).constraint

        if (constraint === 'user_username_unique') {
        }
      }
      */
    }

    if (errors.length) return { errors }

    return { user }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em, req }: MyContext
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

    req.session.userId = user.id

    return { user }
  }
}
