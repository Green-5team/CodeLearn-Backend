import { AuthModule } from '../auth/auth.module'
import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSchema } from 'src/auth/schemas/auth.schema';
@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: 'Auth', schema: AuthSchema }])],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
